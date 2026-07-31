import "dotenv/config";
import { connectKeeperHub } from "../src/keeperhub/client.js";
import { checkPositionViaKeeperHub } from "../src/keeperhub/aave.js";

async function main() {
  const client = await connectKeeperHub(process.env.KEEPERHUB_API_KEY!);
  const snap = await checkPositionViaKeeperHub(client, "0x30a4D03B3640dB4B902D2313216e1F569faF5A83");
  console.log(snap);
}
main().catch((e) => { console.error(e); process.exit(1); });
