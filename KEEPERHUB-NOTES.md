# Integration notes for KeeperHub

Written as a first-time KeeperHub user, logged while building Bulwark. Each
item cost real debugging time and has a concrete reproduction. Published in
case it saves the next integrator the same hours, and offered to the
KeeperHub team as documentation feedback.

## 1. `referralCode` is documented optional but required at execution

`search_protocol_actions`' schema lists `aave-v3/supply`'s `referralCode` as
optional. Execution rejects the call without it.

## 2. Amount fields are raw base units, and getting it wrong can fail silently

Amounts on `execute_contract_call` and `execute_protocol_action` are raw
base-unit integers, not human-readable decimals.

The loud version: passing `"1"` when minting test tokens triggers Aave's
`INVALID_MINT_AMOUNT`, because 1 wei rounds to zero internally. That one
teaches you quickly.

The quiet version is the dangerous one. Passing a repay amount of `"60"`
instead of `"60000000"` does not error at all. It repays $0.00006 instead of
$60, returns success, and the debt barely moves. On a write path that moves
money, an off-by-1,000,000x that reports success is worth guarding against.
Validating that an amount is not implausibly small for the asset's decimals,
or accepting a decimal string and scaling server side, would close this for
every integrator.

## 3. `aave-v3/repay` requires `interestRateMode`

Not surfaced anywhere an integrator sees before the call hard-fails with
`interestRateMode: uint256 cannot be empty`. A line in the tool's own
description field would catch it, since that is what `listTools` returns.

## 4. Verifying a KeeperHub-executed transaction needs event logs, not calldata

A KeeperHub-executed transaction has KeeperHub's relay contract as its
top-level `to`, so the top-level calldata is KeeperHub's meta-execution
format rather than the target protocol's. Decoding it against Aave's
`repay()` ABI, which is the natural first instinct when building a
verifier, produces garbage.

The real proof is in the event logs the underlying call emitted: the ERC20
`Transfer` into Aave's aEthUSDC receipt token, and Aave's own `Repay` event.
`scripts/verify-live-proof.ts` in this repo does this correctly and is a
working reference.

This matters more than it used to, because hackathon judging increasingly
means an agent cloning a repo and trying to verify its claims independently.
A short doc note on "how to independently verify a KeeperHub-executed
transaction" would help.

## 5. Gas sponsorship on Sepolia is broader than documented

KeeperHub sponsors gas on Sepolia writes too (`"sponsored": true` observed
on every write this project made), not only Ethereum mainnet as the docs
implied. Worth documenting, it is a genuine selling point for testnet
development.

## Not a KeeperHub issue: shared testnet reserve state

At time of writing, the shared Aave V3 Sepolia USDC reserve is in a
degraded state from hackathon load: roughly 4.39 billion in nominal
outstanding debt against a few hundred real USDC actually backing it, with
its supply cap already exceeded (`SUPPLY_CAP_EXCEEDED`, Aave error 51), so
topping up liquidity by supplying more is blocked too.

Anyone demoing against this reserve needs to size borrows to real available
liquidity rather than the nominal reserve numbers. `scripts/check-liquidity.ts`
measures it.
