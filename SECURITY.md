# Security policy

Bulwark executes real onchain transactions that move funds. The notes below
are specific to this project, not generic advice.

## Scope and current status

Bulwark currently targets **Aave V3 on Ethereum Sepolia (chain id 11155111)**,
a testnet. It has not been audited and is not production ready. Do not point
it at a mainnet position or a wallet holding real value.

## Credentials this project touches

- **`KEEPERHUB_API_KEY`** is an organisation level credential. Anyone holding
  it can execute transactions through your KeeperHub organisation, including
  spending the reserve wallet's balance. It belongs in `.env`, which is
  gitignored. Never commit it, never paste it into an issue or a pull
  request, and rotate it if it is ever exposed.
- **`BORROWER_PRIVATE_KEY`** is only used by the two local scripts that act
  as the demo borrower (`scripts/borrow-as-borrower.ts` and
  `scripts/withdraw-as-borrower.ts`). It is deliberately **not** read from
  `.env`. Pass it inline for a single run so it does not persist to disk:

  ```
  BORROWER_PRIVATE_KEY=0xyourkey npx tsx scripts/borrow-as-borrower.ts
  ```

  Use a throwaway testnet only key. Never use a key that holds real funds.

## Design decisions that exist for safety reasons

If you are changing the agent loop, these are load bearing. Please do not
remove them without understanding why they are there.

- **The repay call is never retried.** A repay is a payment. Retrying a write
  that may have already landed onchain (where only the response failed to
  come back) risks paying twice. Recovery is handled by the next poll
  re-reading real onchain state and resizing the repay from scratch, which
  is safe by construction. See the comment block in `src/agent.ts`.
- **Ticks are locked per address.** A slow KeeperHub round trip must not
  overlap with the next poll for the same position, or a double repay
  becomes possible.
- **`MAX_REPAY_USDC` caps any single trigger** regardless of what the sizing
  math computes. It is a backstop against a bad oracle read or a bug in the
  sizing path.
- **Amounts are raw base units end to end.** `repayOnBehalfOf` takes
  `amountRawUnits` deliberately. An earlier version scaled from human units
  internally and silently under repaid by a factor of one million when the
  conversion was missed, with no error raised. Keep the conversion in one
  place (`src/engine/repaySizing.ts`) and keep the boundary explicit.
- **Config is validated at startup.** `HF_THRESHOLD` and `HF_TARGET` must
  parse to finite numbers. A `NaN` here would make the health check fail
  open, because every comparison against `NaN` is false, which would cause
  the agent to attempt a repay on every tick for every position.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Use GitHub's private vulnerability reporting on this repository (the
**Security** tab, then **Report a vulnerability**), or contact the maintainer
privately through their GitHub profile at
[@Risingtell](https://github.com/Risingtell).

Expect an acknowledgement within a few days. This is a hackathon project
maintained by one person, so please be patient with response times.
