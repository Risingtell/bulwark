# Bulwark

The execution counterpart to [VigilOK](https://okx.ai/agents/6032). VigilOK reads Aave V3 health factor and tells you if you're at risk. It never acts. Bulwark closes that loop: it watches one or more positions' health factor on Aave V3 (Sepolia), and when one drops below a safe threshold, it repays just enough debt to bring it back to a target health factor — a real onchain transaction, executed through [KeeperHub](https://keeperhub.com), not a local signer.

Built for the [KeeperHub Agents Onchain Hackathon](https://dorahacks.io/hackathon/agents-onchain/detail).

## How it works

1. On every poll, Bulwark reads `Pool.getUserAccountData(borrower)` for each configured position — a single canonical call that already returns `healthFactor` and `totalDebtBase`.
2. If health factor drops below `HF_THRESHOLD`, Bulwark computes exactly how much debt to repay to bring that position back up to `HF_TARGET` — not a fixed amount regardless of how far under threshold the position is. The sizing is derived straight from the current HF and debt (see `src/engine/repaySizing.ts`), converted to the debt asset's raw units via a live oracle price read, and clamped to an optional `MAX_REPAY_USDC` safety cap.
3. Bulwark calls KeeperHub's execution tools (via its MCP server) to execute that repay on the borrower's behalf, from a reserve wallet KeeperHub custodies. A failed attempt retries up to 3 times with a short backoff; a position that's mid-tick is locked so a slow poll can't overlap with the next one and risk a double repay.
4. KeeperHub handles gas, sponsorship, and the audit trail. Bulwark just decides when to pull the trigger and how much to pull.

## Verified, not assumed

- Aave V3 Sepolia contract addresses cross-checked live on-chain (`scripts/preflight.ts`): `PoolAddressesProvider.getPool()` matches the configured Pool address, and `Pool.getReservesList()` returns 9 real reserves.
- Repay asset is Aave's test USDC on Sepolia (`0x94a9...E4C8`, 6 decimals), confirmed via `scripts/symbols.ts`.
- KeeperHub MCP tool schemas are read live via `scripts/inspect-tools.ts` before being wired into the agent loop — nothing here is guessed from docs alone.
- The full catch-and-repay loop is proven on real Sepolia transactions, not just typechecked: borrow, trigger, repay, and health factor recovery, each cross-checked against both KeeperHub's relayed read and a direct RPC read (`src/engine/aave.ts`) that bypasses KeeperHub entirely.
- The repay-sizing formula is verified deterministically against known inputs (`scripts/verify-repay-sizing.ts`), independent of any live pool's state.

## Real gotchas found building this (first-time KeeperHub user, logged as we went)

- `search_protocol_actions`' schema lists `aave-v3/supply`'s `referralCode` as optional; it's actually required at execution time.
- Amount fields on `execute_contract_call` / `execute_protocol_action` are raw base-unit integers, not human-readable — confirmed by deliberately triggering Aave's `INVALID_MINT_AMOUNT` (amount `"1"` = 1 wei, rounds to zero internally).
- `aave-v3/repay` requires an `interestRateMode` argument that isn't obvious from the write path alone — omitting it fails outright (`interestRateMode: uint256 cannot be empty`).
- The silent version of the above: passing a repay amount as human units ("60") instead of scaling it to raw base units doesn't error at all — it just repays 1,000,000x less than intended ($0.00006 instead of $60). No exception, no revert, debt just barely moves. This is the one most likely to bite someone in production.
- The shared Sepolia Aave USDC reserve is, at time of writing, in an economically broken state from hackathon load: 4.39 **billion** in nominal outstanding debt against roughly 300 real USDC actually backing it, and its supply cap is already exceeded too (`SUPPLY_CAP_EXCEEDED`, Aave error 51) — so you can't top up liquidity by supplying more. Borrowing has to be sized to the real available liquidity (`scripts/check-liquidity.ts`), not the nominal reserve numbers.
- On that same degraded reserve, borrow amounts don't always register as debt 1:1 — a confirmed, wallet-balance-verified 65 USDC borrow only showed up as a ~5 USDC debt increase on Aave's own books (cross-checked three ways: `getUserAccountData`, the raw variable debt token `balanceOf`, and the KeeperHub relay — all three agreed with each other, ruling out a read bug on our side). Looks like an interest-index precision artifact from the reserve's degenerate utilization, not something arithmetic can reliably predict. Lesson: on a reserve this abused, don't trust a borrow to land the nominal amount in the debt accounting — verify collateral-side changes (which stayed reliable) over debt-side ones where possible.
- KeeperHub sponsors gas on Sepolia writes too (`"sponsored": true` observed), not just mainnet Ethereum as the docs implied.

## Setup

```
npm install
cp .env.example .env   # fill in KEEPERHUB_API_KEY and MONITORED_ADDRESSES
npm run preflight       # confirms the Aave contracts are live
npm run inspect-tools   # confirms the KeeperHub tool schemas
npm run dev
```

Config (`.env`):

- `MONITORED_ADDRESSES` — comma-separated list of Aave V3 Sepolia positions to watch.
- `HF_THRESHOLD` — health factor that triggers a repay (default `1.2`).
- `HF_TARGET` — health factor a trigger repays enough debt to reach; must be greater than `HF_THRESHOLD` (default `1.5`).
- `MAX_REPAY_USDC` — optional ceiling on how much a single trigger will ever repay, regardless of what the sizing math computes.

## Status

Core loop proven live end to end on Sepolia. Build window is July 27 to August 13, 2026.
