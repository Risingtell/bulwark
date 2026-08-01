import { publicClient } from "../src/chain/sepolia.js";

const VARIABLE_DEBT_TOKEN = "0x36B5dE936eF1710E1d22EabE5231b28581a92ECc" as const;
const BORROWER = "0x30a4D03B3640dB4B902D2313216e1F569faF5A83" as const;

const ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "scaledBalanceOf", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const [bal, scaledBal] = await Promise.all([
    publicClient.readContract({ address: VARIABLE_DEBT_TOKEN, abi: ABI, functionName: "balanceOf", args: [BORROWER] }),
    publicClient.readContract({ address: VARIABLE_DEBT_TOKEN, abi: ABI, functionName: "scaledBalanceOf", args: [BORROWER] }),
  ]);
  console.log("raw variable debt token balanceOf (nominal, current, 6dp):", bal.toString(), "=", Number(bal) / 1e6, "USDC");
  console.log("scaledBalanceOf (index-scaled, 6dp):", scaledBal.toString(), "=", Number(scaledBal) / 1e6);
}
main().catch((e) => { console.error(e); process.exit(1); });
