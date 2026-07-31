import { publicClient, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const LINK = "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5" as const;

const ORACLE_ABI = [
  { type: "function", name: "getAssetPrice", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "BASE_CURRENCY_UNIT", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const [price, baseUnit] = await Promise.all([
    publicClient.readContract({ address: AAVE_V3_SEPOLIA.ORACLE, abi: ORACLE_ABI, functionName: "getAssetPrice", args: [LINK] }),
    publicClient.readContract({ address: AAVE_V3_SEPOLIA.ORACLE, abi: ORACLE_ABI, functionName: "BASE_CURRENCY_UNIT" }),
  ]);
  console.log("LINK price (USD):", Number(price) / Number(baseUnit));
}
main().catch((e) => { console.error(e); process.exit(1); });
