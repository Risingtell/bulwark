/**
 * Deterministic check of the computed-repay-sizing math against known
 * inputs — doesn't depend on the shared Sepolia reserve's live (and, per
 * 2026-08-01 findings, unreliable) debt accounting at all.
 */
import { computeRepayAmountBase, baseUnitsToAssetRawUnits } from "../src/engine/repaySizing.js";
import { getAssetPriceBase } from "../src/engine/aave.js";
import { USDC } from "../src/chain/sepolia.js";

function check(label: string, condition: boolean) {
  console.log(`[${condition ? "PASS" : "FAIL"}] ${label}`);
  if (!condition) process.exitCode = 1;
}

async function main() {
  // Case 1: real numbers seen live 2026-08-01 (HF=1.1054546309873037, debt=$210.009915) — repay to reach HF_TARGET=1.5.
  const hf1 = 1.1054546309873037;
  const debt1 = 21000991500n; // matches the live totalDebtBase read at that HF
  const target1 = 1.5;
  const repayBase1 = computeRepayAmountBase({ healthFactor: hf1, totalDebtBase: debt1, targetHf: target1 });
  // constant = HF * debt (collateral*liqThreshold, should be ~unchanged by a repay) = 1.1054546309873037 * 21000991500 ~= 23,215,197,663
  // target debt = constant / target = 23,215,197,663 / 1.5 ~= 15,476,798,442
  // expected repay ~= 21,000,991,500 - 15,476,798,442 ~= 5,524,193,058 (~$55.24)
  const expectedRepay1 = 5_524_193_058n;
  const tolerance1 = 5_000_000n; // $0.05 tolerance for float rounding in the HF scale
  check(
    `case 1: repay ~$55.24 to reach HF 1.5 from HF ${hf1.toFixed(4)} (got ${(Number(repayBase1) / 1e8).toFixed(4)})`,
    repayBase1 > expectedRepay1 - tolerance1 && repayBase1 < expectedRepay1 + tolerance1,
  );

  // Case 2: HF already at/above target -> repay should be exactly 0, no-op.
  const repayBase2 = computeRepayAmountBase({ healthFactor: 1.8293299421437337, totalDebtBase: 9001030200n, targetHf: 1.5 });
  check(`case 2: HF above target produces 0 repay (got ${repayBase2})`, repayBase2 === 0n);

  // Case 3: no debt -> 0, must not divide by zero or throw.
  const repayBase3 = computeRepayAmountBase({ healthFactor: 999, totalDebtBase: 0n, targetHf: 1.5 });
  check(`case 3: zero debt produces 0 repay, no throw (got ${repayBase3})`, repayBase3 === 0n);

  // Case 4: base-currency -> raw USDC unit conversion against the live oracle price.
  const priceBase = await getAssetPriceBase(USDC.address as `0x${string}`);
  console.log("live USDC price (base units):", priceBase.toString());
  const rawUnits = baseUnitsToAssetRawUnits(repayBase1, priceBase, USDC.decimals);
  const rawUsdc = Number(rawUnits) / 10 ** USDC.decimals;
  check(`case 4: ~$55.24 base-currency converts to ~55.24 raw USDC (got ${rawUsdc.toFixed(4)})`, rawUsdc > 54 && rawUsdc < 57);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
