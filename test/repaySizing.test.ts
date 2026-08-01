import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRepayAmountBase, baseUnitsToAssetRawUnits } from "../src/engine/repaySizing.js";

test("computeRepayAmountBase sizes a repay to land at the target HF, using real numbers seen live 2026-08-01", () => {
  const repay = computeRepayAmountBase({
    healthFactor: 1.1054546309873037,
    totalDebtBase: 21000991500n,
    targetHf: 1.5,
  });
  const expected = 5_524_193_058n; // ~$55.24, hand-derived: constant = HF*debt, target debt = constant/1.5
  const tolerance = 5_000_000n; // $0.05, float-to-fixed-point rounding
  assert.ok(repay > expected - tolerance && repay < expected + tolerance, `expected ~${expected}, got ${repay}`);
});

test("computeRepayAmountBase returns 0 when HF is already at or above target (no-op, not a negative repay)", () => {
  const repay = computeRepayAmountBase({ healthFactor: 1.8293299421437337, totalDebtBase: 9001030200n, targetHf: 1.5 });
  assert.equal(repay, 0n);
});

test("computeRepayAmountBase returns 0 for zero debt without throwing (no position to protect)", () => {
  const repay = computeRepayAmountBase({ healthFactor: 999, totalDebtBase: 0n, targetHf: 1.5 });
  assert.equal(repay, 0n);
});

test("computeRepayAmountBase never suggests repaying more than the current debt, even deeply underwater", () => {
  const repay = computeRepayAmountBase({ healthFactor: 0.5, totalDebtBase: 1_000_000_000n, targetHf: 1.5 });
  assert.ok(repay > 0n && repay < 1_000_000_000n, `repay ${repay} must be strictly between 0 and total debt`);
});

test("baseUnitsToAssetRawUnits converts base-currency USD into raw USDC units at a $1.00 oracle price", () => {
  const priceBase = 100_000_000n; // USDC's live Sepolia oracle price, verified $1.00 exactly
  const raw = baseUnitsToAssetRawUnits(5_524_193_058n, priceBase, 6);
  assert.ok(raw > 55_000_000n && raw < 56_000_000n, `expected ~55.24 USDC raw units, got ${raw}`);
});

test("baseUnitsToAssetRawUnits throws on a non-positive price instead of dividing by zero", () => {
  assert.throws(() => baseUnitsToAssetRawUnits(1000n, 0n, 6));
  assert.throws(() => baseUnitsToAssetRawUnits(1000n, -1n, 6));
});

test("computed repay, converted to raw units, actually lands the position at the target HF (end-to-end sizing check)", () => {
  const healthFactor = 1.1311586367057567;
  const totalDebtBase = 3001195100n;
  const targetHf = 1.5;
  const priceBase = 100_000_000n;

  const repayBase = computeRepayAmountBase({ healthFactor, totalDebtBase, targetHf });
  const repayRaw = baseUnitsToAssetRawUnits(repayBase, priceBase, 6);

  // Re-derive the resulting HF from first principles: constant = HF*debt is conserved by a repay.
  const constant = healthFactor * Number(totalDebtBase);
  const debtAfter = Number(totalDebtBase) - Number(repayBase);
  const hfAfter = constant / debtAfter;

  assert.ok(Math.abs(hfAfter - targetHf) < 0.001, `expected HF to land within 0.001 of ${targetHf}, got ${hfAfter}`);
  assert.ok(repayRaw > 7_300_000n && repayRaw < 7_500_000n, `expected ~7.38 USDC (the real live-verified amount), got ${repayRaw}`);
});
