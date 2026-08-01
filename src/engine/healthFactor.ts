/**
 * Shared health-factor parsing. Aave expresses it as an 18-decimal fixed
 * point uint256, with uint256::MAX as the "no debt / infinite" sentinel.
 * Used by both the direct-viem read path (engine/aave.ts, for independent
 * verification) and the KeeperHub relay path (keeperhub/aave.ts, the one
 * actually used by the agent).
 */
const WAD = 10n ** 18n;
const MAX_UINT256 = 2n ** 256n - 1n;

export type RiskLevel = "NO_DEBT" | "SAFE" | "CAUTION" | "DANGER" | "LIQUIDATABLE";

export function classifyRisk(healthFactor: number | null): RiskLevel {
  if (healthFactor === null) return "NO_DEBT";
  if (healthFactor < 1.0) return "LIQUIDATABLE";
  if (healthFactor < 1.1) return "DANGER";
  if (healthFactor < 1.5) return "CAUTION";
  return "SAFE";
}

/** Accepts either a bigint (direct contract read) or a decimal string (KeeperHub's JSON response). */
export function parseHealthFactor(raw: bigint | string, totalDebtBase: bigint | string): number | null {
  const hf = typeof raw === "string" ? BigInt(raw) : raw;
  const debt = typeof totalDebtBase === "string" ? BigInt(totalDebtBase) : totalDebtBase;
  if (debt === 0n || hf >= MAX_UINT256 / 2n) return null;
  return Number(hf) / Number(WAD);
}
