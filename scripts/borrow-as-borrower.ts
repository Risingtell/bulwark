/**
 * Run this yourself, locally, with your own borrower private key. It never
 * gets shared with or seen by anyone else. Borrows USDC on Aave V3 Sepolia,
 * onBehalfOf yourself (interestRateMode=2, variable). Reads BORROWER_PRIVATE_KEY
 * from the environment; set it inline for one run, don't put it in .env:
 *
 *   BORROWER_PRIVATE_KEY=0xyourkey npx tsx scripts/borrow-as-borrower.ts
 *
 * Use a throwaway/testnet-only key, not one holding real funds.
 *
 * SECOND BORROW (2026-08-01): the first 200 USDC borrow + partial 60 USDC
 * repay already happened (HF recovered to ~1.66, SAFE). This amount is now
 * sized to re-trigger Bulwark a second time to verify the new computed-repay-
 * sizing logic (src/engine/repaySizing.ts) against a real position instead
 * of just a no-debt smoke test. Lands HF around 1.13 against current debt.
 */
import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
const BORROW_AMOUNT_USDC = "65000000"; // 65 USDC, 6 decimals, pushes total debt to ~$205, landing HF around 1.13

const POOL_ABI = parseAbi([
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external",
]);

async function main() {
  const pk = process.env.BORROWER_PRIVATE_KEY;
  if (!pk) throw new Error("Set BORROWER_PRIVATE_KEY (inline, not in .env) before running this");

  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log("Borrowing as:", account.address);

  const wallet = createWalletClient({ account, chain: sepolia, transport: http() });

  const hash = await wallet.writeContract({
    address: AAVE_V3_SEPOLIA.POOL,
    abi: POOL_ABI,
    functionName: "borrow",
    args: [USDC, BigInt(BORROW_AMOUNT_USDC), 2n, 0, account.address],
  });

  console.log("Borrow tx sent:", hash);
  console.log("https://sepolia.etherscan.io/tx/" + hash);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
