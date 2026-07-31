import { publicClient } from "../src/chain/sepolia.js";
import { ERC20_ABI } from "../src/engine/abi.js";

const ORG_WALLET = "0xA55142eA377A9732e071D4bd5df21C7ae57136Bb" as const;
const DAI = "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357" as const;
const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" as const;

async function main() {
  const [dai, usdc] = await Promise.all([
    publicClient.readContract({ address: DAI, abi: ERC20_ABI, functionName: "balanceOf", args: [ORG_WALLET] }),
    publicClient.readContract({ address: USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [ORG_WALLET] }),
  ]);
  console.log("org DAI balance (raw):", dai.toString());
  console.log("org USDC balance (raw):", usdc.toString());
}
main().catch((e) => { console.error(e); process.exit(1); });
