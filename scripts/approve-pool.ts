import "dotenv/config";
import { connectKeeperHub, callTool } from "../src/keeperhub/client.js";
import { sepolia, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const DAI = "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357";
const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";

const ERC20_APPROVE_ABI = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
];

async function approve(client: Awaited<ReturnType<typeof connectKeeperHub>>, token: string, amount: string, label: string) {
  console.log(`Approving Pool to spend ${label}...`);
  const res = await callTool(client, "execute_contract_call", {
    contract_address: token,
    chain_id: String(sepolia.id),
    function_name: "approve",
    function_args: JSON.stringify([AAVE_V3_SEPOLIA.POOL, amount]),
    abi: JSON.stringify(ERC20_APPROVE_ABI),
  });
  console.log(JSON.stringify(res.content, null, 2));
}

async function main() {
  const client = await connectKeeperHub(process.env.KEEPERHUB_API_KEY!);
  await approve(client, DAI, "2000000000000000000000", "DAI");
  await approve(client, USDC, "500000000", "USDC");
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
