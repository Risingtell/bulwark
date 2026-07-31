import "dotenv/config";
import { connectKeeperHub, callTool } from "../src/keeperhub/client.js";
import { sepolia, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const FAUCET = "0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D";
const LINK = "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5";
const ORG_WALLET = "0xA55142eA377A9732e071D4bd5df21C7ae57136Bb";

const FAUCET_ABI = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "uint256" }] },
];
const ERC20_APPROVE_ABI = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
];

async function main() {
  const client = await connectKeeperHub(process.env.KEEPERHUB_API_KEY!);
  const chainId = String(sepolia.id);

  console.log("Minting 50 LINK to org wallet...");
  const mint = await callTool(client, "execute_contract_call", {
    contract_address: FAUCET,
    chain_id: chainId,
    function_name: "mint",
    function_args: JSON.stringify([LINK, ORG_WALLET, "50000000000000000000"]),
    abi: JSON.stringify(FAUCET_ABI),
  });
  console.log(JSON.stringify(mint.content, null, 2));

  console.log("\nApproving Pool to spend LINK...");
  const approve = await callTool(client, "execute_contract_call", {
    contract_address: LINK,
    chain_id: chainId,
    function_name: "approve",
    function_args: JSON.stringify([AAVE_V3_SEPOLIA.POOL, "50000000000000000000"]),
    abi: JSON.stringify(ERC20_APPROVE_ABI),
  });
  console.log(JSON.stringify(approve.content, null, 2));
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
