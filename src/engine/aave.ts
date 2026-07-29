/**
 * Real Aave V3 (Sepolia) health-factor read — a single canonical call to
 * Pool.getUserAccountData(), which already returns healthFactor directly.
 * No off-chain recomputation from collateral/debt legs; one read, one number.
 */
import { type Address, getAddress } from "viem";
import { publicClient, AAVE_V3_SEPOLIA } from "../chain/sepolia.js";
import { POOL_ABI } from "./abi.js";

const WAD = 10n ** 18n;
const MAX_UINT256 = 2n ** 256n - 1n;

export type RiskLevel = "NO_DEBT" | "SAFE" | "CAUTION" | "DANGER" | "LIQUIDATABLE";

export interface PositionSnapshot {
  address: Address;
  hasPosition: boolean;
  totalCollateralUsd: number;
  totalDebtUsd: number;
  healthFactor: number | null; // null = no debt, effectively infinite
  riskLevel: RiskLevel;
}

export function classifyRisk(healthFactor: number | null): RiskLevel {
  if (healthFactor === null) return "NO_DEBT";
  if (healthFactor < 1.0) return "LIQUIDATABLE";
  if (healthFactor < 1.1) return "DANGER";
  if (healthFactor < 1.5) return "CAUTION";
  return "SAFE";
}

/** Aave's Base currency on Sepolia is USD-denominated, 8 decimals (verified in preflight). */
const BASE_CURRENCY_DECIMALS = 8;

export async function checkPosition(address: string): Promise<PositionSnapshot> {
  const user = getAddress(address);
  const account = await publicClient.readContract({
    address: AAVE_V3_SEPOLIA.POOL,
    abi: POOL_ABI,
    functionName: "getUserAccountData",
    args: [user],
  });
  const [totalCollateralBase, totalDebtBase, , , , healthFactorRaw] = account;

  const healthFactor = totalDebtBase === 0n || healthFactorRaw >= MAX_UINT256 / 2n ? null : Number(healthFactorRaw) / Number(WAD);

  return {
    address: user,
    hasPosition: totalCollateralBase > 0n || totalDebtBase > 0n,
    totalCollateralUsd: Number(totalCollateralBase) / 10 ** BASE_CURRENCY_DECIMALS,
    totalDebtUsd: Number(totalDebtBase) / 10 ** BASE_CURRENCY_DECIMALS,
    healthFactor,
    riskLevel: classifyRisk(healthFactor),
  };
}
