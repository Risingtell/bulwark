/**
 * Direct viem read of Aave V3 (Sepolia) — used as an independent check
 * against the KeeperHub-relayed read (keeperhub/aave.ts), not the agent's
 * primary path. If the two ever disagree, that's a real finding, not noise.
 */
import { type Address, getAddress } from "viem";
import { publicClient, AAVE_V3_SEPOLIA } from "../chain/sepolia.js";
import { POOL_ABI, ORACLE_ABI } from "./abi.js";
import { classifyRisk, parseHealthFactor, type RiskLevel } from "./healthFactor.js";

export interface PositionSnapshot {
  address: Address;
  hasPosition: boolean;
  totalCollateralUsd: number;
  totalDebtUsd: number;
  healthFactor: number | null; // null = no debt, effectively infinite
  riskLevel: RiskLevel;
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
  const healthFactor = parseHealthFactor(healthFactorRaw, totalDebtBase);

  return {
    address: user,
    hasPosition: totalCollateralBase > 0n || totalDebtBase > 0n,
    totalCollateralUsd: Number(totalCollateralBase) / 10 ** BASE_CURRENCY_DECIMALS,
    totalDebtUsd: Number(totalDebtBase) / 10 ** BASE_CURRENCY_DECIMALS,
    healthFactor,
    riskLevel: classifyRisk(healthFactor),
  };
}

/** Live oracle price of `asset`, in the same base-currency scale as getUserAccountData's totalDebtBase. */
export async function getAssetPriceBase(asset: Address): Promise<bigint> {
  return publicClient.readContract({
    address: AAVE_V3_SEPOLIA.ORACLE,
    abi: ORACLE_ABI,
    functionName: "getAssetPrice",
    args: [asset],
  });
}

export { classifyRisk };
