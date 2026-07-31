/**
 * Aave V3 reads and repay writes relayed through KeeperHub's protocol-action
 * tools (execute_protocol_action, actionType aave-v3/*), not a raw contract
 * call — KeeperHub normalizes the ABI details, we only handle the numbers.
 * Verified live 2026-07-29: aave-v3/get-user-account-data against a fresh
 * address round-trips uint256::MAX for healthFactor, matching our own
 * MAX_UINT256 sentinel handling.
 */
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { callTool } from "./client.js";
import { classifyRisk, parseHealthFactor, type RiskLevel } from "../engine/healthFactor.js";
import { sepolia, USDC } from "../chain/sepolia.js";

const CHAIN_ID = String(sepolia.id);
/** Aave V3 interestRateMode: 1 = stable, 2 = variable. Bulwark's borrow flow only ever opens variable-rate debt. */
const VARIABLE_RATE_MODE = "2";

export interface KeeperHubPositionSnapshot {
  address: string;
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  healthFactor: number | null;
  riskLevel: RiskLevel;
}

interface GetUserAccountDataResult {
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: string;
  ltv: string;
  healthFactor: string;
}

function extractJson<T>(content: unknown): T {
  const first = Array.isArray(content) ? content[0] : undefined;
  const text = first && typeof first === "object" && "text" in first ? (first as { text: string }).text : undefined;
  if (!text) throw new Error(`KeeperHub tool returned no text content: ${JSON.stringify(content)}`);
  const parsed = JSON.parse(text);
  if (parsed.success === false) throw new Error(`KeeperHub action failed: ${JSON.stringify(parsed)}`);
  return (parsed.result ?? parsed) as T;
}

export async function checkPositionViaKeeperHub(client: Client, address: string): Promise<KeeperHubPositionSnapshot> {
  const res = await callTool(client, "execute_protocol_action", {
    actionType: "aave-v3/get-user-account-data",
    params: { network: CHAIN_ID, user: address },
  });
  const result = extractJson<GetUserAccountDataResult>(res.content);
  const totalCollateralBase = BigInt(result.totalCollateralBase);
  const totalDebtBase = BigInt(result.totalDebtBase);
  const healthFactor = parseHealthFactor(result.healthFactor, totalDebtBase);

  return {
    address,
    totalCollateralBase,
    totalDebtBase,
    healthFactor,
    riskLevel: classifyRisk(healthFactor),
  };
}

export interface RepayResult {
  raw: unknown;
}

/**
 * Repays `amountUsdc` (human units, e.g. "50") of the given asset on behalf of `borrower`. No borrower
 * approval needed — Aave's repay() allows anyone to pay down anyone's debt.
 *
 * KeeperHub's execute_protocol_action amount fields are raw base-unit integers, not human-readable
 * (same gotcha as the INVALID_MINT_AMOUNT case during setup) — confirmed live 2026-07-31: passing "60"
 * unscaled repaid 0.00006 USDC (60 base units), not 60 USDC. Debt barely moved and no error was thrown,
 * so this fails silently if you don't scale it.
 */
export async function repayOnBehalfOf(client: Client, params: { asset: string; amountUsdc: string; borrower: string; idempotencyKey?: string }): Promise<RepayResult> {
  const amountBaseUnits = (BigInt(params.amountUsdc) * 10n ** BigInt(USDC.decimals)).toString();
  const res = await callTool(client, "execute_protocol_action", {
    actionType: "aave-v3/repay",
    params: {
      network: CHAIN_ID,
      asset: params.asset,
      amount: amountBaseUnits,
      onBehalfOf: params.borrower,
      interestRateMode: VARIABLE_RATE_MODE,
    },
  });
  return { raw: extractJson(res.content) };
}
