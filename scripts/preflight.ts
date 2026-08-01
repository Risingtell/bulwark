/**
 * Live verification of the Aave V3 Sepolia addresses before anything is built
 * on top of them. Per house rule, never trust a fetched or summarized address:
 * confirm against a real RPC read first.
 */
import { createPublicClient, http, defineChain } from "viem";

const sepolia = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://ethereum-sepolia-rpc.publicnode.com"] } },
  blockExplorers: { default: { name: "Etherscan", url: "https://sepolia.etherscan.io" } },
});

const client = createPublicClient({ chain: sepolia, transport: http() });

const CANDIDATES = {
  POOL_ADDRESSES_PROVIDER: "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A",
  POOL: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  PROTOCOL_DATA_PROVIDER: "0x3e9708d80f7B3e43118013075F7e95CE3AB31F31",
  ORACLE: "0x2da88497588bf89281816106C7259e31AF45a663",
} as const;

const POOL_ABI = [
  { type: "function", name: "getReservesList", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
] as const;

const PROVIDER_ABI = [
  { type: "function", name: "getPool", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

async function main() {
  console.log("Chain: Sepolia (11155111)\n");

  for (const [name, address] of Object.entries(CANDIDATES)) {
    const code = await client.getCode({ address: address as `0x${string}` });
    console.log(`${name} ${address}: bytecode ${code && code !== "0x" ? `${(code.length - 2) / 2} bytes` : "EMPTY (not a contract!)"}`);
  }

  console.log("\nCross-check: PoolAddressesProvider.getPool() should equal POOL");
  const poolFromProvider = await client.readContract({
    address: CANDIDATES.POOL_ADDRESSES_PROVIDER as `0x${string}`,
    abi: PROVIDER_ABI,
    functionName: "getPool",
  });
  console.log(`  getPool() returned: ${poolFromProvider}`);
  console.log(`  matches POOL const: ${poolFromProvider.toLowerCase() === CANDIDATES.POOL.toLowerCase()}`);

  console.log("\nPool.getReservesList()");
  const reserves = await client.readContract({
    address: CANDIDATES.POOL as `0x${string}`,
    abi: POOL_ABI,
    functionName: "getReservesList",
  });
  console.log(`  ${reserves.length} reserves:`, reserves);
}

main().catch((e) => {
  console.error("PREFLIGHT FAILED:", e.message ?? e);
  process.exit(1);
});
