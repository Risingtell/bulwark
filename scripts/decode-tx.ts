/** Decodes a submitted tx's actual calldata against Aave's real borrow() signature — settles disputes between what we intended to send and what the chain actually recorded, independent of any relay's read path. */
import { decodeAbiParameters, parseAbiParameters } from "viem";
import { publicClient } from "../src/chain/sepolia.js";

async function main() {
  const hash = process.argv[2] as `0x${string}`;
  if (!hash) throw new Error("Usage: npx tsx scripts/decode-tx.ts 0x<txHash>");

  const tx = await publicClient.getTransaction({ hash });
  const receipt = await publicClient.getTransactionReceipt({ hash });
  console.log("status:", receipt.status, "block:", receipt.blockNumber.toString());
  console.log("to:", tx.to);
  console.log("from:", tx.from);
  console.log("input:", tx.input);
  console.log("logs:", receipt.logs.length);
  for (const log of receipt.logs) {
    console.log(" - address:", log.address, "topics:", log.topics, "data:", log.data);
    if (log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
      console.log("   ^ ERC20 Transfer value:", BigInt(log.data), "=", Number(BigInt(log.data)) / 1e6, "(6dp) /", Number(BigInt(log.data)) / 1e18, "(18dp)");
    }
  }

  console.log("selector:", tx.input.slice(0, 10));
  const paramsHex = ("0x" + tx.input.slice(10)) as `0x${string}`;
  const [asset, amount, interestRateMode, referralCode, onBehalfOf] = decodeAbiParameters(
    parseAbiParameters("address, uint256, uint256, uint16, address"),
    paramsHex,
  );
  console.log("asset:", asset);
  console.log("amount:", amount.toString(), "=", Number(amount) / 1e6, "USDC (assuming 6 decimals)");
  console.log("interestRateMode:", interestRateMode.toString());
  console.log("referralCode:", referralCode);
  console.log("onBehalfOf:", onBehalfOf);
}
main().catch((e) => { console.error(e); process.exit(1); });
