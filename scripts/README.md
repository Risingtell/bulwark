# Scripts index

This folder accumulated one-off verification and setup scripts while building
Bulwark against real, live infrastructure (per the project's "verified, not
guessed" rule). Most of it is diagnostic reference, not part of the agent's
runtime. `src/agent.ts` (via `npm start` or `npm run dev`) is the actual
product; everything below is how it was verified and set up.

## Read-only checks (safe to run any time)

- `preflight.ts`: confirms Aave V3 Sepolia contract addresses are live.
- `symbols.ts`: confirms token symbols and decimals.
- `inspect-tools.ts`: lists KeeperHub's live MCP tool schemas.
- `check-balance.ts` and `org-balances.ts`: org wallet's ETH and USDC/DAI balances.
- `check-borrower.ts`: reads the demo borrower's Aave position via KeeperHub.
- `cross-check-position.ts`: reads the same position via both KeeperHub's relay
  and a direct RPC call and diffs them (used to rule out relay-side staleness).
- `check-usdc-balance.ts`: raw USDC wallet balance via plain `balanceOf`.
- `check-debt-token.ts`: raw variable debt token balance, bypassing
  `getUserAccountData`'s price-oracle aggregation.
- `check-liquidity.ts`: real vs. nominal USDC liquidity in the shared reserve.
- `check-link-price.ts`: live LINK oracle price.
- `check-caps.ts` and `check-all-caps.ts`: supply and borrow caps per asset.
- `check-reserve-config.ts`: LTV, liquidation threshold, and borrowing-enabled flags.
- `check-mintable.ts` and `check-faucet.ts`: Aave Sepolia faucet capability checks.
- `check-wallet-and-read.ts`: combined wallet and read smoke test.
- `get-status.ts`: checks a specific KeeperHub execution ID's status.
- `decode-tx.ts`: decodes any given tx hash's calldata and event logs against
  known ABIs. Pass a hash as `argv[2]`, or it defaults to the first live repay.
- `verify-repay-sizing.ts`: sizing-math sanity check against a live oracle
  price read (the fast, deterministic version of these same checks is
  `npm test` and `test/repaySizing.test.ts`; this one additionally hits the
  real network).

## The real proof

- `verify-live-proof.ts` (run via `npm run verify`): re-derives
  the historical borrow and repay transactions directly from chain data. Start
  here if you want to verify Bulwark's claims yourself.

## One-off setup actions

These already ran once to build the live demo position. They are not
idempotent, so don't re-run them blindly.

- `fund-org-wallet.ts` and `fund-link.ts`: minted test DAI, USDC, and LINK into
  the org wallet via Aave's Sepolia faucet.
- `approve-pool.ts`: approved the Aave Pool to spend the org wallet's tokens.
- `supply-collateral.ts`: supplied LINK as collateral on the demo borrower's behalf.
- `test-supply.ts`, `test-supply-link.ts`, and `explore-aave-actions.ts`: early
  exploratory checks of KeeperHub's `aave-v3/*` actions.
- `inject-usdc-liquidity.ts`: attempted to top up the shared reserve's real
  liquidity, and documents hitting `SUPPLY_CAP_EXCEEDED`. A dead end, kept as
  evidence for the onboarding-friction writeup, not something to re-run.
- `borrow-as-borrower.ts` and `withdraw-as-borrower.ts`: borrow or withdraw as
  the demo borrower. Require `BORROWER_PRIVATE_KEY` set inline (never in
  `.env`) with your own throwaway Sepolia key.
- `smoke-agent.ts`: one-shot dry run of the agent's tick logic against a
  known no-debt address, with no repay risk.
