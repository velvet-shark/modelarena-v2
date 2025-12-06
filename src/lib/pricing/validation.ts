import { z } from "zod";

const audioPricingSchema = z.object({
  withAudio: z.number().min(0),
  withoutAudio: z.number().min(0),
});

const resolutionTierSchema = z.object({
  maxWidth: z.number().int().positive(),
  maxHeight: z.number().int().positive(),
  price: z.number().min(0),
});

const perSecondPricingSchema = z.object({
  model: z.literal("per-second"),
  pricePerSecond: z.union([z.number().min(0), audioPricingSchema]),
  currency: z.literal("USD").optional(),
  isEstimated: z.boolean().optional(),
});

const basePlusPerSecondPricingSchema = z.object({
  model: z.literal("base-plus-per-second"),
  basePrice: z.number().min(0),
  baseDuration: z.number().positive(),
  pricePerExtraSecond: z.union([z.number().min(0), audioPricingSchema]),
  currency: z.literal("USD").optional(),
  isEstimated: z.boolean().optional(),
});

const flatRatePricingSchema = z.object({
  model: z.literal("flat-rate"),
  price: z.number().min(0),
  currency: z.literal("USD").optional(),
  isEstimated: z.boolean().optional(),
});

const resolutionDependentPricingSchema = z.object({
  model: z.literal("resolution-dependent"),
  tiers: z.array(resolutionTierSchema).min(1),
  pricingType: z.enum(["per-second", "flat-rate"]),
  currency: z.literal("USD").optional(),
  isEstimated: z.boolean().optional(),
});

export const pricingConfigSchema = z.union([
  perSecondPricingSchema,
  basePlusPerSecondPricingSchema,
  flatRatePricingSchema,
  resolutionDependentPricingSchema,
]);

/**
 * Validate pricing configuration
 */
export function validatePricingConfig(config: unknown): boolean {
  const result = pricingConfigSchema.safeParse(config);
  if (!result.success) {
    console.error("[Pricing] Validation failed:", result.error.errors);
    return false;
  }
  return true;
}
