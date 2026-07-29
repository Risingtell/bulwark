/** One-shot dry run of the agent's tick logic against a no-debt address — confirms the KeeperHub read path end to end without any repay attempt. */
import "dotenv/config";
import { connectKeeperHub } from "../src/keeperhub/client.js";
import { tick } from "../src/agent.js";

async function main() {
  const client = await connectKeeperHub(process.env.KEEPERHUB_API_KEY!);
  await tick(client, "0x000000000000000000000000000000000000dEaD", 1.2, "50");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
