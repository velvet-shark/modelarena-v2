import { test } from "node:test";
import assert from "node:assert/strict";
import { CostCalculator, type PricingConfig } from "@/src/lib/pricing";

const ctx = { duration: 8, width: 1280, height: 720 };

test("per-second, with and without audio pricing", () => {
  assert.equal(CostCalculator.calculate({ model: "per-second", pricePerSecond: 0.07 }, ctx).cost, 0.56);
  const audio: PricingConfig = { model: "per-second", pricePerSecond: { withAudio: 0.2, withoutAudio: 0.1 } };
  assert.equal(CostCalculator.calculate(audio, ctx).cost, 0.8);
  assert.equal(CostCalculator.calculate(audio, { ...ctx, hasAudio: true }).cost, 1.6);
});

test("base plus per-second charges only the seconds past the base", () => {
  const config: PricingConfig = { model: "base-plus-per-second", basePrice: 0.35, baseDuration: 5, pricePerExtraSecond: 0.07 };
  assert.equal(CostCalculator.calculate(config, ctx).cost, 0.56);
  assert.equal(CostCalculator.calculate(config, { ...ctx, duration: 4 }).cost, 0.35);
});

test("flat rate ignores duration", () => {
  assert.equal(CostCalculator.calculate({ model: "flat-rate", price: 0.5 }, ctx).cost, 0.5);
});

test("resolution tiers: smallest that fits, either orientation, highest as fallback", () => {
  const config: PricingConfig = {
    model: "resolution-dependent",
    pricingType: "per-second",
    tiers: [
      { maxWidth: 1920, maxHeight: 1080, price: 0.2 },
      { maxWidth: 1280, maxHeight: 720, price: 0.1 },
    ],
  };
  assert.equal(CostCalculator.calculate(config, ctx).cost, 0.8);
  assert.equal(CostCalculator.calculate(config, { ...ctx, width: 720, height: 1280 }).cost, 0.8);
  assert.equal(CostCalculator.calculate(config, { ...ctx, width: 1920, height: 1080 }).cost, 1.6);
  assert.equal(CostCalculator.calculate(config, { ...ctx, width: 3840, height: 2160 }).cost, 1.6);
  assert.deepEqual(CostCalculator.calculate(config, { duration: 8 }).cost, null);
});

test("unknown cost is null, not 0", () => {
  assert.equal(CostCalculator.calculate(null, ctx).cost, null);
  assert.equal(CostCalculator.calculate(undefined, ctx, null).cost, null);
  assert.equal(CostCalculator.calculate({ model: "bogus" } as unknown as PricingConfig, ctx).cost, null);
});

test("costPerSecond fallback; 0 means free", () => {
  assert.equal(CostCalculator.calculate(null, ctx, 0.05).cost, 0.4);
  assert.equal(CostCalculator.calculate(null, ctx, 0).cost, 0);
});

test("rounds to 4 decimals", () => {
  assert.equal(CostCalculator.calculate({ model: "per-second", pricePerSecond: 0.1 }, { duration: 3 }).cost, 0.3);
  assert.equal(CostCalculator.calculate({ model: "per-second", pricePerSecond: 0.033333 }, { duration: 5 }).cost, 0.1667);
});
