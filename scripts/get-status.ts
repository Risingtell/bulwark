import "dotenv/config";
import { connectKeeperHub, callTool } from "../src/keeperhub/client.js";

async function main() {
  const client = await connectKeeperHub(process.env.KEEPERHUB_API_KEY!);
  const executionId = process.argv[2];
  const res = await callTool(client, "get_direct_execution_status", { execution_id: executionId });
  console.log(JSON.stringify(res.content, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
