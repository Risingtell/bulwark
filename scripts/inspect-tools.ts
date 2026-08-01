/**
 * Run once a KEEPERHUB_API_KEY is available. Prints the real tool list and
 * schemas from KeeperHub's MCP server. Used to confirm the exact input
 * shape of execute_check_and_execute / execute_protocol_action before
 * wiring the agent loop against it. Never guess a tool schema; read it here.
 */
import "dotenv/config";
import { connectKeeperHub } from "../src/keeperhub/client.js";

async function main() {
  const apiKey = process.env.KEEPERHUB_API_KEY;
  if (!apiKey) throw new Error("Set KEEPERHUB_API_KEY in .env first");

  const client = await connectKeeperHub(apiKey);
  const { tools } = await client.listTools();
  console.log(`${tools.length} tools available:\n`);
  for (const t of tools) {
    console.log(`--- ${t.name} ---`);
    console.log(t.description);
    console.log(JSON.stringify(t.inputSchema, null, 2));
    console.log();
  }
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
