/** Mints test DAI + USDC into the KeeperHub org wallet via the Aave Sepolia Faucet, using KeeperHub's own execute_contract_call (its wallet already has gas). One-off setup script, not part of the agent runtime. */
import "dotenv/config";
import { connectKeeperHub, callTool } from "../src/keeperhub/client.js";
import { sepolia } from "../src/chain/sepolia.js";

const FAUCET = "0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D";
const DAI = "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357";
const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
const ORG_WALLET = "0xA55142eA377A9732e071D4bd5df21C7ae57136Bb";

const FAUCET_ABI = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "uint256" }] },
];

async function main() {
  const client = await connectKeeperHub(process.env.KEEPERHUB_API_KEY!);
  const chainId = String(sepolia.id);

  console.log("Minting 2000 DAI to org wallet...");
  const daiMint = await callTool(client, "execute_contract_call", {
    contract_address: FAUCET,
    chain_id: chainId,
    function_name: "mint",
    function_args: JSON.stringify([DAI, ORG_WALLET, "2000000000000000000000"]),
    abi: JSON.stringify(FAUCET_ABI),
  });
  console.log(JSON.stringify(daiMint.content, null, 2));

  console.log("\nMinting 500 USDC to org wallet...");
  const usdcMint = await callTool(client, "execute_contract_call", {
    contract_address: FAUCET,
    chain_id: chainId,
    function_name: "mint",
    function_args: JSON.stringify([USDC, ORG_WALLET, "500000000"]),
    abi: JSON.stringify(FAUCET_ABI),
  });
  console.log(JSON.stringify(usdcMint.content, null, 2));
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
