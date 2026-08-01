/** Cross-checks KeeperHub's relayed read against the direct-viem read for the same address. If they disagree, that's a real finding. */
import "dotenv/config";
import { connectKeeperHub } from "../src/keeperhub/client.js";
import { checkPositionViaKeeperHub } from "../src/keeperhub/aave.js";
import { checkPosition } from "../src/engine/aave.js";

async function main() {
  const address = process.argv[2] ?? "0x30a4D03B3640dB4B902D2313216e1F569faF5A83";

  const direct = await checkPosition(address);
  console.log("DIRECT (viem, our own RPC):", direct);

  const client = await connectKeeperHub(process.env.KEEPERHUB_API_KEY!);
  const relayed = await checkPositionViaKeeperHub(client, address);
  console.log("KEEPERHUB RELAY:", relayed);
}
main().catch((e) => { console.error(e); process.exit(1); });
