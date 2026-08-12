/**
 * Run this yourself, locally, with your own borrower private key, the same
 * key as borrow-as-borrower.ts, never shared with or seen by anyone else.
 * Withdraws LINK collateral on Aave V3 Sepolia back to yourself. Reads
 * BORROWER_PRIVATE_KEY from the environment; set it inline for one run,
 * don't put it in .env:
 *
 *   BORROWER_PRIVATE_KEY=0xyourkey npx tsx scripts/withdraw-as-borrower.ts
 *
 * FIFTH WITHDRAW (2026-08-10), for the demo video's live Option A trigger:
 * position going in (cross-checked direct-RPC vs KeeperHub relay, both
 * agreed exactly) was $48.176 collateral (~1.606 LINK at $30), $23.028
 * debt, HF 1.569, liq threshold confirmed 75%. Withdrawing 0.46 LINK
 * (~$13.80) leaves ~1.146 LINK (~$34.38), landing HF ~1.1196 against the
 * unchanged ~$23.03 debt, comfortably below the 1.2 trigger and above the
 * 1.05 config floor.
 */
import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const LINK = "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5";
const WITHDRAW_AMOUNT_LINK = "460000000000000000"; // 0.46 LINK, 18 decimals, leaves ~1.146 LINK (~$34.38), landing HF ~1.1196 against current ~$23.03 debt

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
