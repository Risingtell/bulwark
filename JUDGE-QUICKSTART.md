# Judge quickstart

Fastest path to verify Bulwark's claims yourself. Under 5 minutes, and the two
commands that matter most need **no KeeperHub account, no signup, no API key**.

```
git clone <this repo>
cd bulwark
npm install
```

## 1. Prove the sizing math is real (10 seconds, no network)

```
npm test
```

**What proves the claim:** 7/7 tests pass, including one that re-derives the
exact live-verified repay amount (7.37978 USDC) from the position's real
health factor and debt, and confirms the resulting HF lands within 0.001 of
the configured target. That's the same computation the live agent ran.

## 2. Prove the on-chain transactions are real (15 seconds, needs only a public RPC)

```
npm run verify
```

**What proves the claim:** re-derives three real Sepolia transactions
directly from chain data (a borrow, a fixed-amount repay, and a
computed-sizing repay), independent of anything this README says. The
borrow is checked via its decoded calldata; the two repays are checked via
their actual on-chain event logs instead (the USDC `Transfer` into Aave's
own aEthUSDC receipt token, and Aave's own `Repay` event), since KeeperHub
executes them through its own relay contract. Expected output:
`ALL CHECKS PASSED`. Every hash it checks is also clickable on Sepolia
Etherscan if you want to look yourself:

- Borrow: https://sepolia.etherscan.io/tx/0x8bf14628cc6b0f71252db60037f8bc47ab1f3da9ac9330ce8bf73a302646dc78
- First repay (fixed 60 USDC): https://sepolia.etherscan.io/tx/0xf59fdb427cea9702f06ff2db4f84e8c8171769e33a07b8b2967ab0744c50b547
- Computed-sizing repay (7.37978 USDC): https://sepolia.etherscan.io/tx/0xbe0dcaa912a4b3261913ae23a47d95b166474c12f0d5fa7c14105d2a37930cc0

## 3. Prove the KeeperHub integration itself is real (needs your own KeeperHub API key)

```
npm run preflight       # confirms live Aave contract addresses
npm run inspect-tools   # lists KeeperHub's 35 live MCP tool schemas
```

`preflight` should print 9 real Aave reserves. `inspect-tools` should print
35 tools including `execute_protocol_action`, the one Bulwark actually calls.

## 4. Watch it run live (needs your own KeeperHub API key + Aave Sepolia position)

```
cp .env.example .env   # fill in KEEPERHUB_API_KEY and MONITORED_ADDRESSES
npm run dev
```

If your configured position's health factor is above `HF_THRESHOLD`
(default 1.2), you'll see it logged as `SAFE` every 60 seconds and nothing
else. That's correct behavior, not a stall. To watch it actually trigger,
you need a position with HF under 1.2 on Aave V3 Sepolia. `scripts/README.md`
documents how the demo position itself was built if you want to reproduce
a live trigger from scratch.

## What each check actually proves, in one line

| Command | Proves |
|---|---|
| `npm test` | The repay-sizing formula is correct math, deterministically |
| `npm run verify` | Three specific past transactions really happened as claimed |
| `npm run preflight` | The Aave contract addresses this code targets are real and live |
| `npm run inspect-tools` | KeeperHub's tools are wired up from live schemas, not guessed |
| `npm run dev` | The full agent loop runs against your own KeeperHub account |
