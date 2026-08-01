/**
 * Computes how much debt to repay to bring a position from its current
 * health factor back up to a target, instead of repaying a fixed amount
 * regardless of how far under threshold the position actually is.
 *
 * Derivation avoids a separate liquidationThreshold/collateral read: since
 * HF = (collateral * liqThreshold) / debt, that product is recoverable
 * directly from the current HF and debt (both already read every tick),
 * so the only extra input needed is the target HF.
 */
export function computeRepayAmountBase(params: { healthFactor: number; totalDebtBase: bigint; targetHf: number }): bigint {
  const { healthFactor, totalDebtBase, targetHf } = params;
  if (totalDebtBase <= 0n || healthFactor >= targetHf) return 0n;

  const SCALE = 1_000_000n; // fixed-point scale for the HF ratio, keeps this on bigint math
  const hfScaled = BigInt(Math.round(healthFactor * Number(SCALE)));
  const targetHfScaled = BigInt(Math.round(targetHf * Number(SCALE)));

  const targetDebtBase = (totalDebtBase * hfScaled) / targetHfScaled;
  const repayBase = totalDebtBase - targetDebtBase;
  return repayBase > 0n ? repayBase : 0n;
}

/** Converts a base-currency (8-decimal, USD-normalized) amount into an asset's own raw units via its live oracle price (same base-currency scale, so BASE_CURRENCY_UNIT cancels out of the ratio). */
export function baseUnitsToAssetRawUnits(baseUnits: bigint, assetPriceBase: bigint, assetDecimals: number): bigint {
  if (assetPriceBase <= 0n) throw new Error("assetPriceBase must be positive");
  return (baseUnits * 10n ** BigInt(assetDecimals)) / assetPriceBase;
}
