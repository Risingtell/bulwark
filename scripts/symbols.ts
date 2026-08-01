/** Lists every Aave V3 Sepolia reserve with its symbol and decimals. Confirms the repay asset (USDC) before it's hardcoded into chain/sepolia.ts. */
import { publicClient, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";
import { ERC20_ABI } from "../src/engine/abi.js";

const RESERVES_ABI = [
  { type: "function", name: "getReservesList", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
] as const;
const DECIMALS_ABI = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

async function main() {
  const reserves = await publicClient.readContract({
    address: AAVE_V3_SEPOLIA.POOL,
    abi: RESERVES_ABI,
    functionName: "getReservesList",
  });

  for (const addr of reserves) {
    const [symbol, decimals] = await Promise.all([
      publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: "symbol" }),
      publicClient.readContract({ address: addr, abi: DECIMALS_ABI, functionName: "decimals" }),
    ]);
    console.log(addr, symbol, decimals);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
