import "dotenv/config";
import { connectKeeperHub, callTool } from "../src/keeperhub/client.js";
import { publicClient, sepolia } from "../src/chain/sepolia.js";

const LINK = "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5";
const LINK_A_TOKEN = "0x3FfAf50D4F4E96eB78f2407c090b72e86eCaed24" as const;
const BORROWER = "0x30a4D03B3640dB4B902D2313216e1F569faF5A83";

const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const before = await publicClient.readContract({ address: LINK_A_TOKEN, abi: ERC20_ABI, functionName: "balanceOf", args: [BORROWER] });
  console.log("aLINK balance before:", before.toString());

  const client = await connectKeeperHub(process.env.KEEPERHUB_API_KEY!);
  const res = await callTool(client, "execute_protocol_action", {
    actionType: "aave-v3/supply",
    params: { network: String(sepolia.id), asset: LINK, amount: "40000000000000000000", onBehalfOf: BORROWER, referralCode: "0" },
  });
  console.log("supply result:", JSON.stringify(res.content, null, 2));

  const after = await publicClient.readContract({ address: LINK_A_TOKEN, abi: ERC20_ABI, functionName: "balanceOf", args: [BORROWER] });
  console.log("aLINK balance after:", after.toString());
  console.log("delta:", (after - before).toString());
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
