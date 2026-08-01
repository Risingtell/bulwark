/**
 * Bulwark's agent loop: on an interval, read every monitored position's
 * health factor through KeeperHub, and for any that have dropped below
 * HF_THRESHOLD, repay just enough debt — sized to land at HF_TARGET, not a
 * fixed amount — to bring it back to safety. Every decision and every
 * action is logged to stdout; KeeperHub's own execution log is the
 * canonical audit trail for what actually landed on-chain.
 */
import "dotenv/config";
import { fileURLToPath } from "node:url";
import { connectKeeperHub } from "./keeperhub/client.js";
import { checkPositionViaKeeperHub, repayOnBehalfOf } from "./keeperhub/aave.js";
import { USDC } from "./chain/sepolia.js";
import { getAssetPriceBase } from "./engine/aave.js";
import { computeRepayAmountBase, baseUnitsToAssetRawUnits } from "./engine/repaySizing.js";

const POLL_INTERVAL_MS = 60_000;
const REPAY_MAX_ATTEMPTS = 3;
const REPAY_RETRY_DELAY_MS = 5_000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Per-address lock — a slow tick (KeeperHub latency has run past a minute in testing) must not overlap with the next poll for the same address and risk a double repay. */
const inFlight = new Set<string>();

export interface TickConfig {
  hfThreshold: number;
  hfTarget: number;
  maxRepayRawUnits: bigint | null;
}

export async function tick(client: Awaited<ReturnType<typeof connectKeeperHub>>, monitoredAddress: string, config: TickConfig): Promise<void> {
  if (inFlight.has(monitoredAddress)) {
    console.log(`[skip] ${monitoredAddress} — previous tick still in flight`);
    return;
  }
  inFlight.add(monitoredAddress);

  try {
    const timestamp = new Date().toISOString();
    const snapshot = await checkPositionViaKeeperHub(client, monitoredAddress);
    console.log(`[${timestamp}] ${monitoredAddress} — HF=${snapshot.healthFactor ?? "∞"} risk=${snapshot.riskLevel}`);

    if (snapshot.healthFactor === null || snapshot.healthFactor >= config.hfThreshold) return;

    const repayBase = computeRepayAmountBase({
      healthFactor: snapshot.healthFactor,
      totalDebtBase: snapshot.totalDebtBase,
      targetHf: config.hfTarget,
    });
    if (repayBase === 0n) {
      console.log(`[${timestamp}] TRIGGER but computed repay is 0 (already at/above target) — skipping`);
      return;
    }

    const priceBase = await getAssetPriceBase(USDC.address as `0x${string}`);
    let repayRawUnits = baseUnitsToAssetRawUnits(repayBase, priceBase, USDC.decimals);
    if (config.maxRepayRawUnits !== null && repayRawUnits > config.maxRepayRawUnits) {
      console.log(`[${timestamp}] computed repay ${repayRawUnits} exceeds MAX_REPAY_USDC cap — clamping to ${config.maxRepayRawUnits}`);
      repayRawUnits = config.maxRepayRawUnits;
    }

    console.log(`[${timestamp}] TRIGGER: HF ${snapshot.healthFactor} < threshold ${config.hfThreshold} — repaying ${repayRawUnits} raw units (target HF ${config.hfTarget}) via KeeperHub`);

    for (let attempt = 1; attempt <= REPAY_MAX_ATTEMPTS; attempt++) {
      try {
        const result = await repayOnBehalfOf(client, { asset: USDC.address, amountRawUnits: repayRawUnits.toString(), borrower: monitoredAddress });
        console.log(`[${timestamp}] REPAY RESULT (attempt ${attempt}):`, JSON.stringify(result.raw, null, 2));
        break;
      } catch (err) {
        console.error(`[${timestamp}] REPAY FAILED (attempt ${attempt}/${REPAY_MAX_ATTEMPTS}):`, err);
        if (attempt === REPAY_MAX_ATTEMPTS) {
          console.error(`[${timestamp}] giving up on this trigger — next poll re-reads the real on-chain HF and resizes the repay accordingly, so a missed attempt here doesn't compound.`);
        } else {
          await sleep(REPAY_RETRY_DELAY_MS);
        }
      }
    }
  } finally {
    inFlight.delete(monitoredAddress);
  }
}

function parseAddressList(raw: string): string[] {
  return raw.split(",").map((a) => a.trim()).filter(Boolean);
}

export async function main(): Promise<void> {
  const apiKey = requireEnv("KEEPERHUB_API_KEY");
  const monitoredAddresses = parseAddressList(requireEnv("MONITORED_ADDRESSES"));
  const hfThreshold = Number(process.env.HF_THRESHOLD ?? "1.2");
  const hfTarget = Number(process.env.HF_TARGET ?? "1.5");
  const maxRepayUsdc = process.env.MAX_REPAY_USDC;
  const maxRepayRawUnits = maxRepayUsdc ? BigInt(maxRepayUsdc) * 10n ** BigInt(USDC.decimals) : null;

  if (hfTarget <= hfThreshold) throw new Error(`HF_TARGET (${hfTarget}) must be greater than HF_THRESHOLD (${hfThreshold})`);

  console.log(`Bulwark starting — watching ${monitoredAddresses.length} position(s): ${monitoredAddresses.join(", ")}`);
  console.log(`threshold HF<${hfThreshold}, repay sized to land at HF~${hfTarget}${maxRepayRawUnits !== null ? `, capped at ${maxRepayUsdc} USDC per trigger` : ""}`);

  const client = await connectKeeperHub(apiKey);
  const config: TickConfig = { hfThreshold, hfTarget, maxRepayRawUnits };

  async function pollAll() {
    for (const address of monitoredAddresses) {
      try {
        await tick(client, address, config);
      } catch (err) {
        console.error(`[tick failed] ${address}:`, err);
      }
    }
  }

  await pollAll();
  setInterval(() => {
    pollAll().catch((err) => console.error("poll cycle failed:", err));
  }, POLL_INTERVAL_MS);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error("Bulwark failed to start:", e);
    process.exit(1);
  });
}
