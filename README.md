# Bulwark

The execution counterpart to [VigilOK](https://okx.ai/agents/6032). VigilOK reads Aave V3 health factor and tells you if you're at risk. It never acts. Bulwark closes that loop: it watches a position's health factor on Aave V3 (Sepolia), and when it drops below a safe threshold, it repays debt on the borrower's behalf — a real onchain transaction, executed through [KeeperHub](https://keeperhub.com), not a local signer.

Built for the [KeeperHub Agents Onchain Hackathon](https://dorahacks.io/hackathon/agents-onchain/detail).

## How it works

1. Bulwark reads `Pool.getUserAccountData(borrower)` on Aave V3 Sepolia — a single canonical call that already returns `healthFactor`.
2. If health factor drops below `HF_THRESHOLD`, Bulwark calls KeeperHub's execution tools (via its MCP server) to repay a fixed amount of debt on the borrower's behalf, from a reserve wallet KeeperHub custodies.
3. KeeperHub handles gas, retries, and the audit trail. Bulwark just decides when to pull the trigger.

## Verified, not assumed

- Aave V3 Sepolia contract addresses cross-checked live on-chain (`scripts/preflight.ts`): `PoolAddressesProvider.getPool()` matches the configured Pool address, and `Pool.getReservesList()` returns 9 real reserves.
- Repay asset is Aave's test USDC on Sepolia (`0x94a9...E4C8`, 6 decimals), confirmed via `scripts/symbols.ts`.
- KeeperHub MCP tool schemas are read live via `scripts/inspect-tools.ts` before being wired into the agent loop — nothing here is guessed from docs alone.

## Setup

```
npm install
cp .env.example .env   # fill in KEEPERHUB_API_KEY and MONITORED_ADDRESS
npm run preflight       # confirms the Aave contracts are live
npm run inspect-tools   # confirms the KeeperHub tool schemas
npm run dev
```

## Status

Work in progress — build window is July 27 to August 13, 2026.
