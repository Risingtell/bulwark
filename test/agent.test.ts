import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNumericEnv, parseAddressList, resolveHfConfig } from "../src/agent.js";

// Regression coverage for findings from an independent adversarial review (2026-08-02): a blank env
// var and a missing liquidation-boundary floor both let Bulwark silently run while protecting nothing.

test("parseNumericEnv falls back on an unset var", () => {
  delete process.env.TEST_NUMERIC_ENV;
  assert.equal(parseNumericEnv("TEST_NUMERIC_ENV", 1.2), 1.2);
});

test("parseNumericEnv falls back on a blank var, not Number('') coerced to 0", () => {
  // dotenv turns `FOO=` into an empty string, not undefined. Number("") is 0, which is finite and
  // would silently disable protection if this fell through to the raw Number() coercion instead.
  process.env.TEST_NUMERIC_ENV = "";
  assert.equal(parseNumericEnv("TEST_NUMERIC_ENV", 1.2), 1.2);
  process.env.TEST_NUMERIC_ENV = "   ";
  assert.equal(parseNumericEnv("TEST_NUMERIC_ENV", 1.2), 1.2);
  delete process.env.TEST_NUMERIC_ENV;
});

test("parseNumericEnv throws on a garbled non-numeric value instead of coercing to NaN", () => {
  process.env.TEST_NUMERIC_ENV = "not-a-number";
  assert.throws(() => parseNumericEnv("TEST_NUMERIC_ENV", 1.2));
  delete process.env.TEST_NUMERIC_ENV;
});

test("parseNumericEnv parses a real value", () => {
  process.env.TEST_NUMERIC_ENV = "1.35";
  assert.equal(parseNumericEnv("TEST_NUMERIC_ENV", 1.2), 1.35);
  delete process.env.TEST_NUMERIC_ENV;
});

test("resolveHfConfig rejects a threshold at or below the 1.05 safety floor", () => {
  assert.throws(() => resolveHfConfig(1.0, 1.5));
  assert.throws(() => resolveHfConfig(1.05, 1.5));
  // The finding from the independent review: HF_TARGET=0.9 would previously pass every check
  // (finite, and 0.9 < some higher threshold could still fail the ordering check, but a threshold
  // of 0.5 with a target of 0.9 passed both old checks and would land a "successfully repaid"
  // position still under Aave's 1.0 liquidation line).
  assert.throws(() => resolveHfConfig(0.5, 0.9));
});

test("resolveHfConfig rejects a target at or below its threshold", () => {
  assert.throws(() => resolveHfConfig(1.2, 1.2));
  assert.throws(() => resolveHfConfig(1.2, 1.1));
});

test("resolveHfConfig accepts a sane threshold/target pair", () => {
  assert.deepEqual(resolveHfConfig(1.2, 1.5), { hfThreshold: 1.2, hfTarget: 1.5 });
});

test("parseAddressList checksum-normalizes addresses", () => {
  const lower = "0x30a4d03b3640db4b902d2313216e1f569faf5a83";
  const [result] = parseAddressList(lower);
  assert.equal(result, "0x30a4D03B3640dB4B902D2313216e1F569faF5A83");
});

test("parseAddressList rejects the same address listed twice under different casing", () => {
  // Without normalization this would silently bypass the per-address inFlight lock in agent.ts,
  // letting both entries fire a repay concurrently off the same stale snapshot.
  const mixedCaseDuplicate = "0x30a4D03B3640dB4B902D2313216e1F569faF5A83,0x30a4d03b3640db4b902d2313216e1f569faf5a83";
  assert.throws(() => parseAddressList(mixedCaseDuplicate));
});

test("parseAddressList rejects a malformed address immediately rather than failing later per-tick", () => {
  assert.throws(() => parseAddressList("not-an-address"));
});

test("parseAddressList splits, trims, and preserves order for distinct addresses", () => {
  const raw = " 0x30a4D03B3640dB4B902D2313216e1F569faF5A83 , 0xA55142eA377A9732e071D4bd5df21C7ae57136Bb ";
  const result = parseAddressList(raw);
  assert.deepEqual(result, ["0x30a4D03B3640dB4B902D2313216e1F569faF5A83", "0xA55142eA377A9732e071D4bd5df21C7ae57136Bb"]);
});
