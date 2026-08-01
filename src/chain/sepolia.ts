/**
 * Sepolia (eip155:11155111) chain definition. The chain KeeperHub's write
 * actions support today and Aave's own recommended free testnet for demos.
 * Addresses verified live 2026-07-29 (see scripts/preflight.ts):
 * PoolAddressesProvider.getPool() matches POOL, Pool.getReservesList()
 * returns 9 real reserves.
 */
import { createPublicClient, defineChain, http } from "viem";

export const sepolia = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.SEPOLIA_RPC ?? "https://ethereum-sepolia-rpc.publicnode.com"] } },
  blockExplorers: { default: { name: "Etherscan", url: "https://sepolia.etherscan.io" } },
});

export const publicClient = createPublicClient({ chain: sepolia, transport: http() });

/** Aave V3 on Sepolia, from bgd-labs/aave-address-book, cross-checked live before use. */
export const AAVE_V3_SEPOLIA = {
  POOL: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  POOL_ADDRESSES_PROVIDER: "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A",
  PROTOCOL_DATA_PROVIDER: "0x3e9708d80f7B3e43118013075F7e95CE3AB31F31",
  ORACLE: "0x2da88497588bf89281816106C7259e31AF45a663",
} as const;

/** Aave's test USDC on Sepolia, the repay asset Bulwark's reserve wallet holds. */
export const USDC = { address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", decimals: 6 } as const;
