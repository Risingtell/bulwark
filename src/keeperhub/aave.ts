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
import { sepolia } from "../chain/sepolia.js";

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
 * Repays `amountRawUnits` (the asset's own raw base units, e.g. "60000000" for 60 USDC — same convention
 * as every other execute_protocol_action/execute_contract_call amount in this codebase) of the given
 * asset on behalf of `borrower`. No borrower approval needed — Aave's repay() allows anyone to pay down
 * anyone's debt.
 *
 * Caller is responsible for the human-units-to-raw-units conversion (see engine/repaySizing.ts) — this
 * function used to do that scaling itself from a "human units" string and silently under-repaid by 1e6x
 * when that conversion was missing (confirmed live 2026-07-31: passing "60" unscaled repaid 0.00006 USDC,
 * no error thrown). Taking raw units directly removes the chance of that mismatch recurring here.
 */
export async function repayOnBehalfOf(client: Client, params: { asset: string; amountRawUnits: string; borrower: string }): Promise<RepayResult> {
  const res = await callTool(client, "execute_protocol_action", {
    actionType: "aave-v3/repay",
    params: {
      network: CHAIN_ID,
      asset: params.asset,
      amount: params.amountRawUnits,
      onBehalfOf: params.borrower,
      interestRateMode: VARIABLE_RATE_MODE,
    },
  });
  return { raw: extractJson(res.content) };
}
