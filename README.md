# Bulwark

**Real numbers, not projections:** 3 on-chain Sepolia transactions (1 borrow, 2 repays). Health factor rescued from `CAUTION` to `SAFE` twice. Computed repay sizing landed HF within **6 decimal places** of its configured target (1.500006 vs. 1.5). 20/20 chain-derived proof checks passing (`npm run verify`). 7/7 deterministic tests passing (`npm test`). 4 real integration bugs found and fixed against live KeeperHub and Aave infrastructure.

The execution counterpart to [VigilOK](https://okx.ai/agents/6032). VigilOK reads Aave V3 health factor and tells you if you're at risk, but it never acts. Bulwark closes that loop: it watches one or more positions' health factor on Aave V3 (Sepolia), and when one drops below a safe threshold, it repays just enough debt to bring it back to a target health factor. That's a real onchain transaction, executed through [KeeperHub](https://keeperhub.com), not a local signer.

Built for the [KeeperHub Agents Onchain Hackathon](https://dorahacks.io/hackathon/agents-onchain/detail).

## Capability map

| Bulwark feature | KeeperHub capability used |
|---|---|
| Read every monitored position's health factor | MCP `execute_protocol_action` calling `aave-v3/get-user-account-data` |
| Execute the protective repay on the borrower's behalf | MCP `execute_protocol_action` calling `aave-v3/repay` |
| Gas for every write | KeeperHub gas sponsorship (`sponsored: true`, confirmed on Sepolia) |
| Execution audit trail | KeeperHub's own execution log (`executionId` returned per call) |
| Tool discovery before wiring anything up | MCP `listTools` and `tools_documentation` (`scripts/inspect-tools.ts`) |

## How it works

1. On every poll, Bulwark reads `Pool.getUserAccountData(borrower)` for each configured position, a single canonical call that already returns `healthFactor` and `totalDebtBase`. All positions are checked concurrently, not one at a time.
2. If health factor drops below `HF_THRESHOLD`, Bulwark computes exactly how much debt to repay to bring that position back up to `HF_TARGET`, sized to the position rather than a fixed amount regardless of how far under threshold it is. The sizing is derived straight from the current HF and debt (see `src/engine/repaySizing.ts`), converted to the debt asset's raw units via a live oracle price read, and clamped to an optional `MAX_REPAY_USDC` safety cap.
3. Bulwark calls KeeperHub's execution tools (via its MCP server) to execute that repay on the borrower's behalf, from a reserve wallet KeeperHub custodies. A position that's mid-tick is locked so a slow poll can't overlap with the next one and risk a double repay. The repay call itself is deliberately not retried: a repay is a payment, and retrying a write that may have already landed on-chain risks paying twice. The next poll re-reads real state and resizes the repay fresh instead, which recovers from a failed attempt safely.
4. If every monitored position fails in the same poll cycle, that's the practical signal that the KeeperHub connection itself died, not just one address having a real problem, so Bulwark reconnects before the next cycle instead of silently zombie-ing forever.
5. KeeperHub handles gas, sponsorship, and the audit trail. Bulwark just decides when to pull the trigger and how much to pull.

## Verified, not assumed

- Aave V3 Sepolia contract addresses cross-checked live on-chain (`scripts/preflight.ts`). `PoolAddressesProvider.getPool()` matches the configured Pool address, and `Pool.getReservesList()` returns 9 real reserves.
- Repay asset is Aave's test USDC on Sepolia (`0x94a9...E4C8`, 6 decimals), confirmed via `scripts/symbols.ts`.
- KeeperHub MCP tool schemas are read live via `scripts/inspect-tools.ts` before being wired into the agent loop. Nothing here is guessed from docs alone.
- The full catch-and-repay loop is proven on real Sepolia transactions twice, not just typechecked. Once with a fixed repay amount, once with the computed-sizing logic. The second run landed health factor at 1.500006 against a configured `HF_TARGET` of 1.5, a live on-chain result matching the target to 6 decimal places. Both runs were cross-checked against both KeeperHub's relayed read and a direct RPC read (`src/engine/aave.ts`) that bypasses KeeperHub entirely.
- **`npm run verify` re-derives all three transactions (1 borrow, 2 repays) directly from chain data.** It checks the decoded calldata, the real USDC `Transfer` event into Aave's own aUSDC contract, and Aave's own `Repay` event, needing only a public Sepolia RPC and no KeeperHub API key. Don't take the numbers above on faith, run it.
- **`npm test` runs 7 deterministic checks** on the repay-sizing math (`test/repaySizing.test.ts`) against real numbers seen live, independent of any pool's current state.
- Multi-position support is verified with 2 real addresses polled concurrently in the same cycle (confirmed about 4 milliseconds apart in the logs, not sequential), not just claimed from reading the loop.

## Real gotchas found building this (first-time KeeperHub user, logged as we went)

- `search_protocol_actions`' schema lists `aave-v3/supply`'s `referralCode` as optional, but it's actually required at execution time.
- Amount fields on `execute_contract_call` and `execute_protocol_action` are raw base-unit integers, not human-readable. Confirmed by deliberately triggering Aave's `INVALID_MINT_AMOUNT` (amount `"1"` means 1 wei, which rounds to zero internally).
- `aave-v3/repay` requires an `interestRateMode` argument that isn't obvious from the write path alone. Omitting it fails outright with `interestRateMode: uint256 cannot be empty`.
- The silent version of the above: passing a repay amount as human units ("60") instead of scaling it to raw base units doesn't error at all. It just repays 1,000,000x less than intended, $0.00006 instead of $60. No exception, no revert, debt just barely moves. This is the one most likely to bite someone in production.
- The shared Sepolia Aave USDC reserve is, at time of writing, in an economically broken state from hackathon load. There's 4.39 **billion** in nominal outstanding debt against roughly 300 real USDC actually backing it, and its supply cap is already exceeded too (`SUPPLY_CAP_EXCEEDED`, Aave error 51), so you can't top up liquidity by supplying more. Borrowing has to be sized to the real available liquidity (`scripts/check-liquidity.ts`), not the nominal reserve numbers.
- KeeperHub sponsors gas on Sepolia writes too (`"sponsored": true` observed), not just mainnet Ethereum as the docs implied.
- Not a KeeperHub gotcha, but worth recording: a `Monitor`-wrapped `npm start` stopped via a task-stop call doesn't reliably kill the full Windows process tree (`npm-cli.js` starts `tsx`, which starts the actual `node` loader, and they survive independently). Orphaned agent instances kept polling every 60 seconds and firing real repays in the background, which briefly looked like an Aave-side accounting anomaly until it was traced to PID and command-line evidence and killed via `Get-CimInstance Win32_Process` and `Stop-Process`. Worth an explicit process check before trusting any unexplained on-chain state change.

## Setup

```
npm install
npm test                # 7 deterministic checks on the sizing math, no network needed
npm run verify          # re-derives the real proof from chain data, no API key needed
cp .env.example .env    # fill in KEEPERHUB_API_KEY and MONITORED_ADDRESSES
npm run preflight       # confirms the Aave contracts are live
npm run inspect-tools   # confirms the KeeperHub tool schemas
npm run dev
```

Config (`.env`):

- `MONITORED_ADDRESSES`: comma-separated list of Aave V3 Sepolia positions to watch.
- `HF_THRESHOLD`: health factor that triggers a repay (default `1.2`).
- `HF_TARGET`: health factor a trigger repays enough debt to reach, must be greater than `HF_THRESHOLD` (default `1.5`).
- `MAX_REPAY_USDC`: optional ceiling on how much a single trigger will ever repay, regardless of what the sizing math computes.

## Status

Core loop proven live end to end on Sepolia, including the computed-repay-sizing logic landing health factor within 6 decimal places of its configured target, and multi-position polling verified concurrent against 2 real addresses. Build window is July 27 to August 13, 2026. See `JUDGE-QUICKSTART.md` for the fastest path to verify all of this yourself, and `scripts/README.md` for what every script in this repo does.

## License

MIT, see `LICENSE`.
