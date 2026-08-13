# Bulwark

Bulwark keeps Aave V3 positions from being liquidated. It watches a position's health factor, and when it drops below a safe threshold, it repays enough debt to bring it back. The repay is a real onchain transaction executed through [KeeperHub](https://keeperhub.com), from a real reserve wallet, with no human in the loop and no local signer.

**Watch it live:** [bulwark-console.vercel.app](https://bulwark-console.vercel.app) reads the demo position straight from Sepolia in your browser. No wallet, no install, no signup.

**See it act:** [this repay](https://sepolia.etherscan.io/tx/0xc304c7bd01a241928542802fcda054a2d8ea070edef6ba3daadb5ecb4234183c) was executed by the agent when it caught the position at health factor 1.13, and it landed the position back at 1.5000. Gas sponsored by KeeperHub.

Built for the [KeeperHub Agents Onchain Hackathon](https://dorahacks.io/hackathon/agents-onchain/detail).

## How it works

1. Every 60 seconds, Bulwark reads each watched position's health factor through KeeperHub. All positions are checked concurrently.
2. If one drops below `HF_THRESHOLD`, Bulwark computes how much debt to repay to bring it back to `HF_TARGET`. The amount comes from that position's own live health factor and debt, so it repays what the position actually needs instead of a fixed guess. See `src/engine/repaySizing.ts`.
3. Bulwark executes the repay through KeeperHub's MCP server, on the borrower's behalf, from a KeeperHub-custodied reserve wallet. Aave lets anyone repay anyone's debt, so this needs no approval from the borrower.
4. KeeperHub handles gas, sponsorship, and the execution audit trail.

## KeeperHub capabilities used

| Bulwark feature | KeeperHub capability |
|---|---|
| Read every monitored position's health factor | MCP `execute_protocol_action` calling `aave-v3/get-user-account-data` |
| Execute the protective repay on the borrower's behalf | MCP `execute_protocol_action` calling `aave-v3/repay` |
| Gas for every write | KeeperHub gas sponsorship (`sponsored: true`, confirmed on Sepolia) |
| Execution audit trail | KeeperHub's execution log (`executionId` returned per call) |
| Tool discovery before wiring anything up | MCP `listTools` and `tools_documentation` (`scripts/inspect-tools.ts`) |

## Safety design

Bulwark moves money automatically, so the money path is built around a few deliberate invariants:

- **A failed repay is never retried inside a tick.** Retrying a write that may already have landed onchain risks paying twice. The next poll re-reads real state and sizes a fresh repay from it, which recovers safely on its own.
- **Each position is locked while its tick is in flight**, so a slow poll cannot overlap the next one and fire two repays for the same position.
- **`HF_THRESHOLD` must clear 1.05.** Aave liquidates below 1.0, and KeeperHub round trips have run past a minute under load, so a threshold hugging the liquidation line leaves no real time to act. Config below the floor is rejected at startup rather than accepted quietly.
- **`MAX_REPAY_USDC` caps any single repay**, regardless of what the sizing math computes.
- **Config is validated at startup, not per-tick.** Blank, malformed, or duplicate values fail loudly on boot instead of degrading into a silent no-op later.

## Verify it yourself

```
npm test        # 20 deterministic checks, no network, no keys
npm run verify  # 21 checks re-derived from live chain data, no API key needed
```

`npm run verify` re-derives the three headline transactions straight from Sepolia. The borrow is checked through its decoded calldata. The two repays are checked through their event logs, the ERC20 `Transfer` into Aave's aEthUSDC and Aave's own `Repay` event, because KeeperHub-executed transactions have KeeperHub's relay contract as the top-level call target. Neither command needs a KeeperHub key.

Other things confirmed against live infrastructure rather than assumed: Aave V3 Sepolia addresses (`scripts/preflight.ts` matches `PoolAddressesProvider.getPool()` and reads 9 real reserves), the repay asset's symbol and decimals (`scripts/symbols.ts`), KeeperHub's tool schemas (`scripts/inspect-tools.ts`, read live before being wired in), and multi-position polling running concurrently against 2 real addresses.

## Setup

```
npm install
cp .env.example .env    # fill in KEEPERHUB_API_KEY and MONITORED_ADDRESSES
npm run preflight       # confirms the Aave contracts are live
npm run inspect-tools   # confirms the KeeperHub tool schemas
npm run dev
```

Config (`.env`):

- `MONITORED_ADDRESSES`: comma-separated Aave V3 Sepolia positions to watch.
- `HF_THRESHOLD`: health factor that triggers a repay (default `1.2`, must exceed `1.05`).
- `HF_TARGET`: health factor a repay aims for, must exceed `HF_THRESHOLD` (default `1.5`).
- `MAX_REPAY_USDC`: optional ceiling on any single repay.

## Limitations

- **Testnet only.** This targets Aave V3 on Ethereum Sepolia. It is not audited and should not be pointed at a mainnet position.
- **One protocol, one debt asset.** The repay path is wired for Aave V3 and USDC. Nothing here generalises to other protocols yet.
- **The reserve wallet must stay funded.** If it runs dry, the trigger fires and the repay fails. There is no auto-refill.
- **Reconnect handling is coarse.** Bulwark reconnects when every monitored position fails in the same cycle. A partial or intermittent failure is not specifically detected.

## Further reading

- `JUDGE-QUICKSTART.md`: the fastest path to verifying every claim here yourself.
- `KEEPERHUB-NOTES.md`: integration friction logged as a first-time KeeperHub user, with reproductions.
- `SECURITY.md`: credential handling and the money-path invariants above.
- `scripts/README.md`: what every script does and which are safe to re-run.
- `CONTRIBUTING.md`: setup and the checks to run before a pull request.

## License

MIT, see `LICENSE`.
