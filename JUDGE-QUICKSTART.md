# Judge quickstart

Fastest path to verifying Bulwark's claims yourself. Under 5 minutes, and the
checks that matter most need **no KeeperHub account, no signup, no API key**.

## 0. Look at it running first (no install at all)

[bulwark-console.vercel.app](https://bulwark-console.vercel.app) reads the live
demo position from Sepolia in your browser, using the same contract call the
agent makes. Nothing there is cached or mocked.

```
git clone <this repo>
cd bulwark
npm install
```

## 1. Prove the sizing math is real (10 seconds, no network)

```
npm test
```

20 tests pass. They cover the repay-sizing formula against real numbers seen
live, including one that re-derives the exact executed repay amount
(7.37978 USDC) from the position's real health factor and debt and confirms
the resulting health factor lands within 0.001 of the configured target. They
also cover config validation, price conversion at both $1.00 and non-$1.00
oracle prices, and both 6 and 18 decimal assets.

## 2. Prove the onchain transactions are real (15 seconds, needs only a public RPC)

```
npm run verify
```

21 checks pass, re-derived directly from chain data rather than from anything
these docs claim. Expected output ends with `ALL CHECKS PASSED`.

The borrow is checked through its decoded calldata. The two repays are checked
through their onchain event logs instead, the USDC `Transfer` into Aave's
aEthUSDC receipt token and Aave's own `Repay` event, because KeeperHub executes
them through its own relay contract. Every hash is clickable if you would
rather look yourself:

- Borrow: https://sepolia.etherscan.io/tx/0x8bf14628cc6b0f71252db60037f8bc47ab1f3da9ac9330ce8bf73a302646dc78
- Fixed-amount repay (60 USDC): https://sepolia.etherscan.io/tx/0xf59fdb427cea9702f06ff2db4f84e8c8171769e33a07b8b2967ab0744c50b547
- Computed-sizing repay (7.37978 USDC): https://sepolia.etherscan.io/tx/0xbe0dcaa912a4b3261913ae23a47d95b166474c12f0d5fa7c14105d2a37930cc0

A fourth repay, executed live while recording the demo video, took the position
from health factor 1.13 back to 1.5000:
https://sepolia.etherscan.io/tx/0xc304c7bd01a241928542802fcda054a2d8ea070edef6ba3daadb5ecb4234183c

## 3. Prove the KeeperHub integration is real (needs your own KeeperHub API key)

```
npm run preflight       # confirms live Aave contract addresses
npm run inspect-tools   # lists KeeperHub's live MCP tool schemas
```

`preflight` prints 9 real Aave reserves. `inspect-tools` prints 35 tools
including `execute_protocol_action`, the one Bulwark actually calls.

## 4. Watch it run live (needs your own KeeperHub API key and an Aave Sepolia position)

```
cp .env.example .env   # fill in KEEPERHUB_API_KEY and MONITORED_ADDRESSES
npm run dev
```

If your configured position's health factor is above `HF_THRESHOLD` (default
1.2), you will see it logged as `SAFE` every 60 seconds and nothing else. That
is correct behaviour, not a stall. To watch it trigger, you need a position
under 1.2 on Aave V3 Sepolia. `scripts/README.md` documents how the demo
position was built if you want to reproduce a live trigger from scratch.

## What each check proves

| Command | Proves |
|---|---|
| `npm test` | The repay-sizing formula is correct math, deterministically |
| `npm run verify` | The claimed transactions really happened as described |
| `npm run preflight` | The Aave contract addresses this code targets are real and live |
| `npm run inspect-tools` | KeeperHub's tools are wired from live schemas, not guessed |
| `npm run dev` | The full agent loop runs against your own KeeperHub account |
