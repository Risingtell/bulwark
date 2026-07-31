import { publicClient, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const DAI = "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357" as const;
const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" as const;

const DATA_PROVIDER_ABI = [
  {
    type: "function",
    name: "getReserveConfigurationData",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [
      { name: "decimals", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "liquidationThreshold", type: "uint256" },
      { name: "liquidationBonus", type: "uint256" },
      { name: "reserveFactor", type: "uint256" },
      { name: "usageAsCollateralEnabled", type: "bool" },
      { name: "borrowingEnabled", type: "bool" },
      { name: "stableBorrowRateEnabled", type: "bool" },
      { name: "isActive", type: "bool" },
      { name: "isFrozen", type: "bool" },
    ],
  },
] as const;

const ORACLE_ABI = [
  { type: "function", name: "getAssetPrice", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "BASE_CURRENCY_UNIT", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const [daiConfig, usdcConfig, daiPrice, usdcPrice, baseUnit] = await Promise.all([
    publicClient.readContract({ address: AAVE_V3_SEPOLIA.PROTOCOL_DATA_PROVIDER, abi: DATA_PROVIDER_ABI, functionName: "getReserveConfigurationData", args: [DAI] }),
    publicClient.readContract({ address: AAVE_V3_SEPOLIA.PROTOCOL_DATA_PROVIDER, abi: DATA_PROVIDER_ABI, functionName: "getReserveConfigurationData", args: [USDC] }),
    publicClient.readContract({ address: AAVE_V3_SEPOLIA.ORACLE, abi: ORACLE_ABI, functionName: "getAssetPrice", args: [DAI] }),
    publicClient.readContract({ address: AAVE_V3_SEPOLIA.ORACLE, abi: ORACLE_ABI, functionName: "getAssetPrice", args: [USDC] }),
    publicClient.readContract({ address: AAVE_V3_SEPOLIA.ORACLE, abi: ORACLE_ABI, functionName: "BASE_CURRENCY_UNIT" }),
  ]);
  console.log("DAI: decimals", daiConfig[0], "ltv", Number(daiConfig[1]) / 100, "%", "liqThreshold", Number(daiConfig[2]) / 100, "%", "borrowingEnabled", daiConfig[6]);
  console.log("USDC: decimals", usdcConfig[0], "ltv", Number(usdcConfig[1]) / 100, "%", "liqThreshold", Number(usdcConfig[2]) / 100, "%", "borrowingEnabled", usdcConfig[6]);
  console.log("DAI price (USD):", Number(daiPrice) / Number(baseUnit));
  console.log("USDC price (USD):", Number(usdcPrice) / Number(baseUnit));
}
main().catch((e) => { console.error(e); process.exit(1); });
