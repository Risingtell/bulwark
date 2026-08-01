/** One-shot dry run of the agent's tick logic against a no-debt address. Confirms the KeeperHub read path end to end without any repay attempt. */
import "dotenv/config";
import { connectKeeperHub } from "../src/keeperhub/client.js";
import { tick } from "../src/agent.js";

async function main() {
  const client = await connectKeeperHub(process.env.KEEPERHUB_API_KEY!);
  await tick(client, "0x000000000000000000000000000000000000dEaD", { hfThreshold: 1.2, hfTarget: 1.5, maxRepayRawUnits: null });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
