# Contributing to Bulwark

Thanks for taking a look. This started as a hackathon entry, so it is small
and the whole thing can be read in an afternoon.

## Getting set up

```
npm install
npm test                # 7 deterministic checks on the sizing math, no network needed
npm run verify          # re-derives the real proof from chain data, no API key needed
```

Those two commands need nothing from you: no signup, no API key, no wallet.
If either fails on a fresh clone, that is a bug worth reporting on its own.

To run the agent itself you additionally need a KeeperHub API key and an
Aave V3 Sepolia position to watch:

```
cp .env.example .env    # fill in KEEPERHUB_API_KEY and MONITORED_ADDRESSES
npm run preflight       # confirms the Aave contracts are live
npm run inspect-tools   # confirms the KeeperHub tool schemas
npm run dev
```

`scripts/README.md` explains what every script in `scripts/` is for, which
ones are safe to run any time, and which ones performed one off setup and
should not be re-run blindly.

## Before opening a pull request

Run all three and make sure they pass:

```
npm run build   # tsc --noEmit, strict mode
npm test
npm run verify
```

## House rules for this codebase

- **Verify against real infrastructure, do not assume.** Every contract
  address, tool schema, and token symbol in this repo was confirmed with a
  live read before being hardcoded. `scripts/preflight.ts` and
  `scripts/inspect-tools.ts` exist for exactly this. If you add a constant,
  add the check that proves it.
- **Read `SECURITY.md` before touching the agent loop.** Several things in
  `src/agent.ts` look like they could be simplified but exist to prevent a
  double repay. The no-retry rule on the repay call is the main one.
- **Amounts are raw base units.** Do not introduce a second place that
  converts between human units and base units. That mismatch has already
  caused one silent bug in this project.
- **Name tests after the claim they defend.** `computeRepayAmountBase returns
  0 for zero debt without throwing` is useful in a failure report.
  `test_3` is not.
- **Plain English in comments and docs.** No em dashes, no long dashes. Use
  commas, full stops, or restructure the sentence.

## Reporting a bug

Open an issue using the bug report template. The single most useful thing you
can include is the exact command you ran and its full output, including the
health factor and any transaction hash, so the behaviour can be checked
against the chain rather than guessed at.
