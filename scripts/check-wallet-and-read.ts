import "dotenv/config";
import { connectKeeperHub, callTool } from "../src/keeperhub/client.js";

async function main() {
  const apiKey = process.env.KEEPERHUB_API_KEY!;
  const client = await connectKeeperHub(apiKey);

  console.log("=== list_integrations ===");
  const integrations = await callTool(client, "list_integrations", {});
  console.log(JSON.stringify(integrations.content, null, 2));

  console.log("\n=== aave-v3/get-user-account-data (fresh address, expect no debt) ===");
  const read = await callTool(client, "execute_protocol_action", {
    actionType: "aave-v3/get-user-account-data",
    params: { network: "11155111", user: "0x000000000000000000000000000000000000dEaD" },
  });
  console.log(JSON.stringify(read.content, null, 2));
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
