/**
 * Bulwark's agent loop: on an interval, read the monitored position's health
 * factor through KeeperHub, and if it's dropped below HF_THRESHOLD, repay
 * debt on the borrower's behalf — also through KeeperHub. Every decision and
 * every action is logged to stdout; KeeperHub's own execution log is the
 * canonical audit trail for what actually landed on-chain.
 */
import "dotenv/config";
import { fileURLToPath } from "node:url";
import { connectKeeperHub } from "./keeperhub/client.js";
import { checkPositionViaKeeperHub, repayOnBehalfOf } from "./keeperhub/aave.js";
import { USDC } from "./chain/sepolia.js";

const POLL_INTERVAL_MS = 60_000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export async function tick(client: Awaited<ReturnType<typeof connectKeeperHub>>, monitoredAddress: string, hfThreshold: number, repayAmountUsdc: string) {
  const timestamp = new Date().toISOString();
  const snapshot = await checkPositionViaKeeperHub(client, monitoredAddress);

  console.log(`[${timestamp}] ${monitoredAddress} — HF=${snapshot.healthFactor ?? "∞"} risk=${snapshot.riskLevel}`);

  if (snapshot.healthFactor === null || snapshot.healthFactor >= hfThreshold) {
    return;
  }

  console.log(`[${timestamp}] TRIGGER: HF ${snapshot.healthFactor} < threshold ${hfThreshold} — repaying ${repayAmountUsdc} via KeeperHub`);

  const idempotencyKey = `bulwark-repay-${monitoredAddress}-${new Date().toISOString().slice(0, 10)}`;
  try {
    const result = await repayOnBehalfOf(client, {
      asset: USDC.address,
      amountUsdc: repayAmountUsdc,
      borrower: monitoredAddress,
      idempotencyKey,
    });
    console.log(`[${timestamp}] REPAY RESULT:`, JSON.stringify(result.raw, null, 2));
  } catch (err) {
    console.error(`[${timestamp}] REPAY FAILED:`, err);
  }
}

export async function main() {
  const apiKey = requireEnv("KEEPERHUB_API_KEY");
  const monitoredAddress = requireEnv("MONITORED_ADDRESS");
  const hfThreshold = Number(process.env.HF_THRESHOLD ?? "1.2");
  const repayAmountUsdc = process.env.REPAY_AMOUNT_USDC ?? "50";

  console.log(`Bulwark starting — watching ${monitoredAddress}, threshold HF<${hfThreshold}, repay ${repayAmountUsdc} USDC per trigger`);

  const client = await connectKeeperHub(apiKey);

  await tick(client, monitoredAddress, hfThreshold, repayAmountUsdc);
  setInterval(() => {
    tick(client, monitoredAddress, hfThreshold, repayAmountUsdc).catch((err) => console.error("tick failed:", err));
  }, POLL_INTERVAL_MS);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error("Bulwark failed to start:", e);
    process.exit(1);
  });
}
