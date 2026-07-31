import "dotenv/config";
import { connectKeeperHub, callTool } from "../src/keeperhub/client.js";
import { publicClient, sepolia } from "../src/chain/sepolia.js";

const DAI = "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357";
const DAI_A_TOKEN = "0x29598b72eb5CeBd806C5dCD549490FdA35B13cD8" as const;
const BORROWER = "0x30a4D03B3640dB4B902D2313216e1F569faF5A83";

const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const before = await publicClient.readContract({ address: DAI_A_TOKEN, abi: ERC20_ABI, functionName: "balanceOf", args: [BORROWER] });
  console.log("aDAI balance before:", before.toString());

  const client = await connectKeeperHub(process.env.KEEPERHUB_API_KEY!);
  const res = await callTool(client, "execute_protocol_action", {
    actionType: "aave-v3/supply",
    params: { network: String(sepolia.id), asset: DAI, amount: "1", onBehalfOf: BORROWER, referralCode: "0" },
  });
  console.log("supply result:", JSON.stringify(res.content, null, 2));

  const after = await publicClient.readContract({ address: DAI_A_TOKEN, abi: ERC20_ABI, functionName: "balanceOf", args: [BORROWER] });
  console.log("aDAI balance after:", after.toString());
  console.log("delta:", (after - before).toString());
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
