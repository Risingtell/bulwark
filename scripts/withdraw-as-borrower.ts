/**
 * Run this yourself, locally, with your own borrower private key, the same
 * key as borrow-as-borrower.ts, never shared with or seen by anyone else.
 * Withdraws LINK collateral on Aave V3 Sepolia back to yourself. Reads
 * BORROWER_PRIVATE_KEY from the environment; set it inline for one run,
 * don't put it in .env:
 *
 *   BORROWER_PRIVATE_KEY=0xyourkey npx tsx scripts/withdraw-as-borrower.ts
 *
 * FOURTH WITHDRAW (2026-08-01): the three earlier "debt anomalies" this
 * session turned out to be self-inflicted. Orphaned agent processes from
 * earlier Monitor/TaskStop cycles that never actually died (npm start's
 * process tree survives a Monitor stop on this machine) kept polling every
 * 60s in the background and firing their own real repays independently,
 * fully explaining every "mysterious" debt drop. All confirmed killed via
 * Get-CimInstance + Stop-Process (matched on commandline containing
 * "bulwark") before this run. Collateral-side amounts have been exactly
 * predictable every time, so still using withdrawal to trigger. Position
 * going in (clean, zombie-free read): ~$134.96 collateral (~4.499 LINK),
 * ~$30.01 debt, HF~3.37.
 */
import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";

const LINK = "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5";
const WITHDRAW_AMOUNT_LINK = "2990000000000000000"; // 2.99 LINK, 18 decimals, leaves ~1.51 LINK (~$45.3), landing HF around 1.13 against current ~$30 debt

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
