import { publicClient, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" as const;

const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const DATA_PROVIDER_ABI = [
  {
    type: "function", name: "getReserveTokensAddresses", stateMutability: "view", inputs: [{ type: "address" }],
    outputs: [{ name: "aTokenAddress", type: "address" }, { name: "stableDebtTokenAddress", type: "address" }, { name: "variableDebtTokenAddress", type: "address" }],
  },
  {
    type: "function", name: "getReserveCaps", stateMutability: "view", inputs: [{ type: "address" }],
    outputs: [{ name: "borrowCap", type: "uint256" }, { name: "supplyCap", type: "uint256" }],
  },
] as const;

async function main() {
  const tokens = await publicClient.readContract({
    address: AAVE_V3_SEPOLIA.PROTOCOL_DATA_PROVIDER, abi: DATA_PROVIDER_ABI, functionName: "getReserveTokensAddresses", args: [USDC],
  });
  console.log("Real aTokenAddress:", tokens[0], "variableDebtTokenAddress:", tokens[2]);

  const [realAvailable, variableDebtSupply, caps] = await Promise.all([
    publicClient.readContract({ address: USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [tokens[0]] }),
    publicClient.readContract({ address: tokens[2], abi: ERC20_ABI, functionName: "totalSupply" }),
    publicClient.readContract({ address: AAVE_V3_SEPOLIA.PROTOCOL_DATA_PROVIDER, abi: DATA_PROVIDER_ABI, functionName: "getReserveCaps", args: [USDC] }),
  ]);

  console.log("USDC actual liquidity sitting in aToken (balanceOf):", Number(realAvailable) / 1e6, "USDC");
  console.log("USDC total variable debt outstanding:", Number(variableDebtSupply) / 1e6, "USDC");
  console.log("USDC borrowCap:", caps[0].toString(), "(0 = unlimited)");
}
main().catch((e) => { console.error(e); process.exit(1); });
