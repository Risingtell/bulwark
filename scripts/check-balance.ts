import { publicClient } from "../src/chain/sepolia.js";
import { formatEther } from "viem";

async function main() {
  const address = "0xA55142eA377A9732e071D4bd5df21C7ae57136Bb" as const;
  const balance = await publicClient.getBalance({ address });
  console.log(`${address} — ${formatEther(balance)} ETH (${balance} wei)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
