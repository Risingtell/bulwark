import { publicClient } from "../src/chain/sepolia.js";

const FAUCET = "0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D" as const;
const FAUCET_ABI = [
  { type: "function", name: "isMintable", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
] as const;

const ASSETS = {
  DAI: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
  LINK: "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5",
  WBTC: "0x29f2D40B0605204364af54EC677bD022dA425d03",
  USDT: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
  AAVE: "0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a",
  EURS: "0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E",
  GHO: "0xc4bF5CbDaBE595361438F8c6a187bDc330539c60",
} as const;

async function main() {
  for (const [symbol, address] of Object.entries(ASSETS)) {
    const mintable = await publicClient.readContract({ address: FAUCET, abi: FAUCET_ABI, functionName: "isMintable", args: [address as `0x${string}`] });
    console.log(symbol, mintable);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
