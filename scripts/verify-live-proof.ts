/**
 * Self-verifier: re-derives Bulwark's headline claims directly from chain
 * data instead of asking anyone to trust the README's prose. Needs only a
 * public Sepolia RPC. No KeeperHub API key, no signup, nothing on the
 * critical path. Run with: npm run verify
 *
 * Checks three real, already-broadcast transactions from the 2026-08-01
 * live proof run. The borrow was a direct EOA call to Aave's Pool, so its
 * top-level calldata decodes directly. The two repays were executed via
 * KeeperHub's relay contract as the top-level `to` (confirmed live:
 * decoding top-level calldata against Aave's repay() ABI produces garbage
 * for these, since the relay's own calldata isn't Aave's), so those are instead
 * verified via the underlying event logs: the plain ERC20 Transfer into
 * Aave's aUSDC contract (unambiguous, standard, no relay-specific ABI
 * needed) and Aave's own Repay event's three indexed addresses.
 */
import { decodeAbiParameters, parseAbiParameters } from "viem";
import { publicClient, AAVE_V3_SEPOLIA } from "../src/chain/sepolia.js";
import { POOL_ABI } from "../src/engine/abi.js";
import { parseHealthFactor } from "../src/engine/healthFactor.js";

const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8".toLowerCase();
const A_USDC = "0x16dA4541aD1807f4443d92D26044C1147406EB80".toLowerCase();
const BORROWER = "0x30a4D03B3640dB4B902D2313216e1F569faF5A83".toLowerCase();
const ORG_WALLET = "0xA55142eA377A9732e071D4bd5df21C7ae57136Bb".toLowerCase();

const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
// Aave V3 Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens).
// Empirically confirmed against the real repay tx below (positional match: reserve=USDC, user=borrower, repayer=org wallet), not assumed from docs.
const AAVE_REPAY_TOPIC = "0xa534c8dbe71f871f9f3530e97a74601fea17b426cae02e1c5aee42c96c784051";

const BORROW_TX = "0x8bf14628cc6b0f71252db60037f8bc47ab1f3da9ac9330ce8bf73a302646dc78" as const;
const FIRST_REPAY_TX = "0xf59fdb427cea9702f06ff2db4f84e8c8171769e33a07b8b2967ab0744c50b547" as const;
const COMPUTED_REPAY_TX = "0xbe0dcaa912a4b3261913ae23a47d95b166474c12f0d5fa7c14105d2a37930cc0" as const;

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`[${condition ? "PASS" : "FAIL"}] ${label}`);
  if (!condition) failures++;
}

async function getReceipt(hash: `0x${string}`) {
  return publicClient.getTransactionReceipt({ hash });
}

async function verifyBorrow() {
  console.log("--- Borrow tx (direct EOA call, sets up the demo position) ---");
  const [tx, receipt] = await Promise.all([
    publicClient.getTransaction({ hash: BORROW_TX }),
    getReceipt(BORROW_TX),
  ]);
  check("tx succeeded on-chain (status=success)", receipt.status === "success");
  check("called the real Aave Pool contract directly", tx.to?.toLowerCase() === AAVE_V3_SEPOLIA.POOL.toLowerCase());

  const paramsHex = ("0x" + tx.input.slice(10)) as `0x${string}`;
  const [asset, amount, , , onBehalfOf] = decodeAbiParameters(parseAbiParameters("address, uint256, uint256, uint16, address"), paramsHex);
  check(`asset is USDC (${asset})`, asset.toLowerCase() === USDC);
  check(`amount is exactly 200 USDC raw units (got ${amount})`, amount === 200_000_000n);
  check(`onBehalfOf is the demo borrower (${onBehalfOf})`, onBehalfOf.toLowerCase() === BORROWER);
  return receipt;
}

async function verifyRepay(hash: `0x${string}`, label: string, expectedAmountRaw: bigint) {
  console.log(`\n--- ${label} ---`);
  const receipt = await getReceipt(hash);
  check("tx succeeded on-chain (status=success)", receipt.status === "success");

  const transferLog = receipt.logs.find(
    (l) => l.address.toLowerCase() === USDC && l.topics[0] === ERC20_TRANSFER_TOPIC && l.topics[2] && ("0x" + l.topics[2].slice(-40)).toLowerCase() === A_USDC,
  );
  check("found a real USDC Transfer event into Aave's aUSDC contract", transferLog !== undefined);
  if (transferLog) {
    const value = BigInt(transferLog.data);
    check(`Transfer value matches the claimed amount exactly (got ${value}, expected ${expectedAmountRaw})`, value === expectedAmountRaw);
    check("Transfer sender is the KeeperHub-custodied org wallet", ("0x" + transferLog.topics[1]!.slice(-40)).toLowerCase() === ORG_WALLET);
  }

  const repayLog = receipt.logs.find((l) => l.address.toLowerCase() === AAVE_V3_SEPOLIA.POOL.toLowerCase() && l.topics[0] === AAVE_REPAY_TOPIC);
  check("found Aave's own Repay event on the Pool contract", repayLog !== undefined);
  if (repayLog) {
    const [, reserveTopic, userTopic, repayerTopic] = repayLog.topics;
    check("Repay event's reserve is USDC", ("0x" + reserveTopic!.slice(-40)).toLowerCase() === USDC);
    check("Repay event's user is the demo borrower", ("0x" + userTopic!.slice(-40)).toLowerCase() === BORROWER);
    check("Repay event's repayer is the org wallet", ("0x" + repayerTopic!.slice(-40)).toLowerCase() === ORG_WALLET);
  }
  return receipt;
}

async function main() {
  console.log(`Verifying against Aave Pool ${AAVE_V3_SEPOLIA.POOL} on Sepolia...\n`);

  await verifyBorrow();
  await verifyRepay(FIRST_REPAY_TX, "First repay tx (fixed 60 USDC, basic catch-and-repay proof)", 60_000_000n);
  const repay2Receipt = await verifyRepay(COMPUTED_REPAY_TX, "Computed-sizing repay tx (7.37978 USDC, proves the sizing math drove a real tx)", 7_379_780n);

  console.log("\n--- Re-deriving the resulting health factor at that exact block ---");
  try {
    const accountData = await publicClient.readContract({
      address: AAVE_V3_SEPOLIA.POOL,
      abi: POOL_ABI,
      functionName: "getUserAccountData",
      args: [BORROWER as `0x${string}`],
      blockNumber: repay2Receipt.blockNumber,
    });
    const [, totalDebtBase, , , , healthFactorRaw] = accountData;
    const hf = parseHealthFactor(healthFactorRaw, totalDebtBase);
    console.log(`Health factor at block ${repay2Receipt.blockNumber}: ${hf}`);
    check(`HF landed within 0.0001 of the claimed 1.500006 (got ${hf})`, hf !== null && Math.abs(hf - 1.500006) < 0.0001);
  } catch (err) {
    console.log(`[SKIP] Historical state read failed (RPC may not be an archive node): ${(err as Error).message.split("\n")[0]}`);
    console.log("       The transaction + event checks above are the load-bearing proof; this step is a bonus.");
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}, re-derived from chain data, not from README prose.`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
