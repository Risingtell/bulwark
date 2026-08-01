/**
 * One-off fix for a drained shared testnet reserve: the Aave Sepolia USDC
 * pool has 4.39B in nominal outstanding debt (every hackathon builder
 * hammering the same faucet) but only ~304 real USDC backing it, not
 * enough to satisfy our planned 780 USDC borrow. Mints fresh test USDC to
 * the org wallet via Aave's Sepolia faucet, then supplies most of it into
 * the pool to inject real liquidity, keeping a chunk back in the org wallet
 * as repay reserve.
 */
import "dotenv/config";
import { connectKeeperHub, callTool } from "../src/keeperhub/client.js";
import { publicClient, sepolia, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const FAUCET = "0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D";
const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" as const;
const USDC_A_TOKEN = "0x16dA4541aD1807f4443d92D26044C1147406EB80" as const;
const ORG_WALLET = "0xA55142eA377A9732e071D4bd5df21C7ae57136Bb" as const;

const MINT_AMOUNT = "2000000000"; // 2000 USDC
const SUPPLY_AMOUNT = "1500000000"; // 1500 USDC injected as pool liquidity
const APPROVE_AMOUNT = "5000000000"; // 5000 USDC allowance headroom (covers supply + future repay pulls)

const FAUCET_ABI = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "uint256" }] },
];
const ERC20_APPROVE_ABI = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
];
const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const client = await connectKeeperHub(process.env.KEEPERHUB_API_KEY!);
  const chainId = String(sepolia.id);

  const orgBefore = await publicClient.readContract({ address: USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [ORG_WALLET] });
  const poolBefore = await publicClient.readContract({ address: USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [USDC_A_TOKEN] });
  console.log("Before, org wallet USDC:", Number(orgBefore) / 1e6, "| real pool liquidity:", Number(poolBefore) / 1e6);

  console.log("\nMinting 2000 USDC to org wallet...");
  const mintRes = await callTool(client, "execute_contract_call", {
    contract_address: FAUCET, chain_id: chainId, function_name: "mint",
    function_args: JSON.stringify([USDC, ORG_WALLET, MINT_AMOUNT]), abi: JSON.stringify(FAUCET_ABI),
  });
  console.log(JSON.stringify(mintRes.content, null, 2));

  console.log("\nApproving Pool for USDC...");
  const approveRes = await callTool(client, "execute_contract_call", {
    contract_address: USDC, chain_id: chainId, function_name: "approve",
    function_args: JSON.stringify([AAVE_V3_SEPOLIA.POOL, APPROVE_AMOUNT]), abi: JSON.stringify(ERC20_APPROVE_ABI),
  });
  console.log(JSON.stringify(approveRes.content, null, 2));

  console.log("\nSupplying 1500 USDC into the pool (onBehalfOf org wallet)...");
  const supplyRes = await callTool(client, "execute_protocol_action", {
    actionType: "aave-v3/supply",
    params: { network: chainId, asset: USDC, amount: SUPPLY_AMOUNT, onBehalfOf: ORG_WALLET, referralCode: "0" },
  });
  console.log(JSON.stringify(supplyRes.content, null, 2));

  const orgAfter = await publicClient.readContract({ address: USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [ORG_WALLET] });
  const poolAfter = await publicClient.readContract({ address: USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [USDC_A_TOKEN] });
  console.log("\nAfter, org wallet USDC:", Number(orgAfter) / 1e6, "| real pool liquidity:", Number(poolAfter) / 1e6);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
