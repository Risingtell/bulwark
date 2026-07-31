import { publicClient } from "../src/chain/sepolia.js";

const FAUCET = "0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D" as const;

const FAUCET_ABI = [
  { type: "function", name: "isPermissioned", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "getMaximumMintAmount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "isMintable", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" as const;
const WETH = "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c" as const;

async function main() {
  const code = await publicClient.getCode({ address: FAUCET });
  console.log(`Faucet bytecode: ${code && code !== "0x" ? `${(code.length - 2) / 2} bytes` : "EMPTY"}`);

  async function tryCall(label: string, fn: () => Promise<unknown>) {
    try {
      console.log(`${label}:`, await fn());
    } catch (e: any) {
      console.log(`${label}: REVERTED (${e.shortMessage ?? e.message})`);
    }
  }

  await tryCall("isPermissioned", () => publicClient.readContract({ address: FAUCET, abi: FAUCET_ABI, functionName: "isPermissioned" }));
  await tryCall("getMaximumMintAmount", () => publicClient.readContract({ address: FAUCET, abi: FAUCET_ABI, functionName: "getMaximumMintAmount" }));
  await tryCall("USDC isMintable", () => publicClient.readContract({ address: FAUCET, abi: FAUCET_ABI, functionName: "isMintable", args: [USDC] }));
  await tryCall("WETH isMintable", () => publicClient.readContract({ address: FAUCET, abi: FAUCET_ABI, functionName: "isMintable", args: [WETH] }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
