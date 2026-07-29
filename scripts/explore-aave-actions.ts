import "dotenv/config";
import { connectKeeperHub, callTool } from "../src/keeperhub/client.js";

async function main() {
  const apiKey = process.env.KEEPERHUB_API_KEY!;
  const client = await connectKeeperHub(apiKey);

  console.log("=== tools_documentation ===");
  const docs = await callTool(client, "tools_documentation", {});
  console.log(JSON.stringify(docs.content, null, 2));

  console.log("\n=== search_protocol_actions (aave-v3) ===");
  const aave = await callTool(client, "search_protocol_actions", { protocol: "aave-v3" });
  console.log(JSON.stringify(aave.content, null, 2));
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
