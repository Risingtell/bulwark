import { publicClient, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const DATA_PROVIDER_ABI = [
  { type: "function", name: "getReserveCaps", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ name: "borrowCap", type: "uint256" }, { name: "supplyCap", type: "uint256" }] },
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
const ERC20_ABI = [
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const ASSETS: Record<string, { underlying: `0x${string}`; aToken: `0x${string}`; decimals: number }> = {
  LINK: { underlying: "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5", aToken: "0x3FfAf50D4F4E96eB78f2407c090b72e86eCaed24", decimals: 18 },
  WBTC: { underlying: "0x29f2D40B0605204364af54EC677bD022dA425d03", aToken: "0x1804Bf30507dc2EB3bDEbbbdd859991EAeF6EefF", decimals: 8 },
  USDT: { underlying: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0", aToken: "0xAF0F6e8b0Dc5c913bbF4d14c22B4E78Dd14310B6", decimals: 6 },
  AAVE: { underlying: "0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a", aToken: "0x6b8558764d3b7572136F17174Cb9aB1DDc7E1259", decimals: 18 },
  EURS: { underlying: "0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E", aToken: "0xB20691021F9AcED8631eDaa3c0Cd2949EB45662D", decimals: 2 },
  GHO: { underlying: "0xc4bF5CbDaBE595361438F8c6a187bDc330539c60", aToken: "0xd190eF37dB51Bb955A680fF1A85763CC72d083D4", decimals: 18 },
  USDC: { underlying: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", aToken: "0x16dA4541aD1807f4443d92D26044C1147406EB80", decimals: 6 },
};

async function main() {
  for (const [symbol, { underlying, aToken, decimals }] of Object.entries(ASSETS)) {
    const [caps, config, totalSupplied] = await Promise.all([
      publicClient.readContract({ address: AAVE_V3_SEPOLIA.PROTOCOL_DATA_PROVIDER, abi: DATA_PROVIDER_ABI, functionName: "getReserveCaps", args: [underlying] }),
      publicClient.readContract({ address: AAVE_V3_SEPOLIA.PROTOCOL_DATA_PROVIDER, abi: DATA_PROVIDER_ABI, functionName: "getReserveConfigurationData", args: [underlying] }),
      publicClient.readContract({ address: aToken, abi: ERC20_ABI, functionName: "totalSupply" }),
    ]);
    const supplyCap = Number(caps[1]);
    const currentSupplied = Number(totalSupplied) / 10 ** decimals;
    const headroom = supplyCap === 0 ? Infinity : supplyCap - currentSupplied;
    console.log(
      `${symbol}: supplyCap=${supplyCap === 0 ? "unlimited" : supplyCap} current=${currentSupplied.toFixed(2)} headroom=${headroom === Infinity ? "unlimited" : headroom.toFixed(2)} active=${config[8]} frozen=${config[9]} ltv=${Number(config[1]) / 100}% liqThresh=${Number(config[2]) / 100}%`,
    );
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
