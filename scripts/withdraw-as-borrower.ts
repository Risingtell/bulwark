/**
 * Run this yourself, locally, with your own borrower private key — same key
 * as borrow-as-borrower.ts, never shared with or seen by anyone else.
 * Withdraws LINK collateral on Aave V3 Sepolia back to yourself. Needed
 * because the real available liquidity in the shared Sepolia USDC reserve
 * (~304 USDC, verified via scripts/check-liquidity.ts — other hackathon
 * builders have drained it far below its nominal supply) can't support the
 * originally planned 780 USDC borrow against 40 LINK. Withdrawing down to
 * 10 LINK first means a smaller, actually-borrowable 200 USDC debt still
 * lands health factor under the 1.2 trigger. Reads BORROWER_PRIVATE_KEY from
 * the environment; set it inline for one run, don't put it in .env:
 *
 *   BORROWER_PRIVATE_KEY=0xyourkey npx tsx scripts/withdraw-as-borrower.ts
 */
import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const LINK = "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5";
const WITHDRAW_AMOUNT_LINK = "30000000000000000000"; // 30 LINK, 18 decimals — leaves 10 LINK (~$300) as collateral

const POOL_ABI = parseAbi([
  "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
]);

async function main() {
  const pk = process.env.BORROWER_PRIVATE_KEY;
  if (!pk) throw new Error("Set BORROWER_PRIVATE_KEY (inline, not in .env) before running this");

  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log("Withdrawing as:", account.address);

  const wallet = createWalletClient({ account, chain: sepolia, transport: http() });

  const hash = await wallet.writeContract({
    address: AAVE_V3_SEPOLIA.POOL,
    abi: POOL_ABI,
    functionName: "withdraw",
    args: [LINK, BigInt(WITHDRAW_AMOUNT_LINK), account.address],
  });

  console.log("Withdraw tx sent:", hash);
  console.log("https://sepolia.etherscan.io/tx/" + hash);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
