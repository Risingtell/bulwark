/**
 * Run this yourself, locally, with your own borrower private key — same key
 * as borrow-as-borrower.ts, never shared with or seen by anyone else.
 * Withdraws LINK collateral on Aave V3 Sepolia back to yourself. Reads
 * BORROWER_PRIVATE_KEY from the environment; set it inline for one run,
 * don't put it in .env:
 *
 *   BORROWER_PRIVATE_KEY=0xyourkey npx tsx scripts/withdraw-as-borrower.ts
 *
 * SECOND WITHDRAW (2026-08-01): the second borrow (65 USDC) landed the full
 * amount in the wallet (confirmed via scripts/check-usdc-balance.ts) but for
 * reasons that look like an index/precision artifact on this heavily-abused
 * shared reserve, only ~5 of it registered as new debt on Aave's own books
 * (confirmed via both getUserAccountData AND the raw debt token balanceOf —
 * see scripts/check-debt-token.ts — so it's a real Aave-side effect, not a
 * read bug). Rather than fight that unpredictable debt-side accounting with
 * more borrowing, pulling collateral out is a separate, well-behaved code
 * path that gets HF under threshold deterministically without touching the
 * scarce shared USDC liquidity at all.
 */
import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const LINK = "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5";
const WITHDRAW_AMOUNT_LINK = "3000000000000000000"; // 3 LINK, 18 decimals — leaves ~7.3 LINK (~$220), landing HF around 1.13 against current debt

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
