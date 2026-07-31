import { publicClient, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const DAI = "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357" as const;
const DAI_A_TOKEN = "0x29598b72eb5CeBd806C5dCD549490FdA35B13cD8" as const;

const DATA_PROVIDER_ABI = [
  { type: "function", name: "getReserveCaps", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ name: "borrowCap", type: "uint256" }, { name: "supplyCap", type: "uint256" }] },
] as const;
const ERC20_ABI = [
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const [caps, totalSupplied] = await Promise.all([
    publicClient.readContract({ address: AAVE_V3_SEPOLIA.PROTOCOL_DATA_PROVIDER, abi: DATA_PROVIDER_ABI, functionName: "getReserveCaps", args: [DAI] }),
    publicClient.readContract({ address: DAI_A_TOKEN, abi: ERC20_ABI, functionName: "totalSupply" }),
  ]);
  console.log("DAI borrowCap:", caps[0].toString(), "supplyCap:", caps[1].toString(), "(0 = unlimited)");
  console.log("Current total aDAI supply (raw):", totalSupplied.toString(), "=", Number(totalSupplied) / 1e18, "DAI");
}
main().catch((e) => { console.error(e); process.exit(1); });
