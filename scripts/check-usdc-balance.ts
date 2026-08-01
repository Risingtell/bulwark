import { publicClient } from "../src/chain/sepolia.js";
import { ERC20_ABI } from "../src/engine/abi.js";

const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" as const;
const BORROWER = "0x30a4D03B3640dB4B902D2313216e1F569faF5A83" as const;
const DECIMALS_ABI = [{ type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }] as const;

async function main() {
  const [decimals, bal] = await Promise.all([
    publicClient.readContract({ address: USDC, abi: DECIMALS_ABI, functionName: "decimals" }),
    publicClient.readContract({ address: USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [BORROWER] }),
  ]);
  console.log("USDC.decimals() on-chain:", decimals);
  console.log("borrower raw USDC balance:", bal.toString(), "=", Number(bal) / 10 ** Number(decimals));
}
main().catch((e) => { console.error(e); process.exit(1); });
