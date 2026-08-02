**What this changes**

**Why**

**How it was verified**

Please say what you actually ran, not what should work in theory.

- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `npm run verify` passes
- [ ] Tested against a live Aave V3 Sepolia position (include the transaction
      hash if a write was involved)

**Does this touch the money path?**

- [ ] No, this is read only, docs, or tooling
- [ ] Yes, and I have read the design notes in `SECURITY.md`

If yes, confirm the following still hold:

- [ ] The repay call is still not wrapped in a retry
- [ ] Ticks are still locked per address
- [ ] `MAX_REPAY_USDC` still caps a single trigger
- [ ] Human units to raw base unit conversion still happens in exactly one place

**Anything a reviewer should look at closely**
