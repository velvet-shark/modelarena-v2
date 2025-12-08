import type {
  PricingConfig,
  CostCalculationContext,
  CostCalculationResult,
  AudioPricing,
  ResolutionTier,
} from "./types";

/**
 * Cost calculator for video generation
 */
export class CostCalculator {
  /**
   * Calculate cost based on pricing config and actual video metrics
   */
  static calculate(
    config: PricingConfig | undefined | null,
    context: CostCalculationContext,
    fallbackCostPerSecond?: number | null
  ): CostCalculationResult {
    // No pricing config available
    if (!config && !fallbackCostPerSecond) {
      return { cost: 0, error: "No pricing configuration available" };
    }

    // Fallback to simple costPerSecond field
    if (!config && fallbackCostPerSecond) {
      return {
        cost: this.roundCost(context.duration * fallbackCostPerSecond),
        breakdown: {
          variablePrice: context.duration * fallbackCostPerSecond,
        },
      };
    }

    // TypeScript narrowing - we know config is not null/undefined here
    const validConfig = config as PricingConfig;

    try {
      switch (validConfig.model) {
        case "per-second":
          return this.calculatePerSecond(validConfig, context);

        case "base-plus-per-second":
          return this.calculateBasePlusPerSecond(validConfig, context);

        case "flat-rate":
          return this.calculateFlatRate(validConfig, context);

        case "resolution-dependent":
          return this.calculateResolutionDependent(validConfig, context);

        default:
          return { cost: 0, error: "Unknown pricing model" };
      }
    } catch (error) {
      console.error("[CostCalculator] Calculation error:", error);
      return {
        cost: 0,
        error: error instanceof Error ? error.message : "Calculation failed",
      };
    }
  }

  private static calculatePerSecond(
    config: Extract<PricingConfig, { model: "per-second" }>,
    context: CostCalculationContext
  ): CostCalculationResult {
    const rate = this.resolveAudioPricing(
      config.pricePerSecond,
      context.hasAudio
    );
    const cost = context.duration * rate;

    return {
      cost: this.roundCost(cost),
      breakdown: { variablePrice: cost },
    };
  }

  private static calculateBasePlusPerSecond(
    config: Extract<PricingConfig, { model: "base-plus-per-second" }>,
    context: CostCalculationContext
  ): CostCalculationResult {
    const extraSeconds = Math.max(0, context.duration - config.baseDuration);
    const extraRate = this.resolveAudioPricing(
      config.pricePerExtraSecond,
      context.hasAudio
    );
    const variablePrice = extraSeconds * extraRate;
    const cost = config.basePrice + variablePrice;

    return {
      cost: this.roundCost(cost),
      breakdown: {
        basePrice: config.basePrice,
        variablePrice,
      },
    };
  }

  private static calculateFlatRate(
    config: Extract<PricingConfig, { model: "flat-rate" }>,
    context: CostCalculationContext
  ): CostCalculationResult {
    return {
      cost: this.roundCost(config.price),
      breakdown: { basePrice: config.price },
    };
  }

  private static calculateResolutionDependent(
    config: Extract<PricingConfig, { model: "resolution-dependent" }>,
    context: CostCalculationContext
  ): CostCalculationResult {
    if (!context.width || !context.height) {
      return {
        cost: 0,
        error: "Resolution required for resolution-dependent pricing",
      };
    }

    // Find matching tier (sorted by resolution, highest first)
    const tier = this.findResolutionTier(
      config.tiers,
      context.width,
      context.height
    );

    if (!tier) {
      return { cost: 0, error: "No matching resolution tier found" };
    }

    const cost =
      config.pricingType === "per-second"
        ? tier.price * context.duration
        : tier.price;

    return {
      cost: this.roundCost(cost),
      breakdown: {
        tier: `${tier.maxWidth}x${tier.maxHeight}`,
        basePrice: config.pricingType === "flat-rate" ? tier.price : undefined,
        variablePrice:
          config.pricingType === "per-second" ? cost : undefined,
      },
    };
  }

  private static findResolutionTier(
    tiers: ResolutionTier[],
    width: number,
    height: number
  ): ResolutionTier | undefined {
    // Normalize dimensions: use longer side as "width" for comparison
    // This handles both horizontal and vertical videos
    const longerSide = Math.max(width, height);
    const shorterSide = Math.min(width, height);

    // Sort tiers by resolution (ascending) to find smallest matching tier
    const sorted = [...tiers].sort(
      (a, b) => a.maxWidth * a.maxHeight - b.maxWidth * b.maxHeight
    );

    const matchingTier = sorted.find((tier) => {
      const tierLonger = Math.max(tier.maxWidth, tier.maxHeight);
      const tierShorter = Math.min(tier.maxWidth, tier.maxHeight);
      return longerSide <= tierLonger && shorterSide <= tierShorter;
    });

    // If no exact match, use the highest tier as fallback
    // (video exceeds all defined resolutions, charge at highest rate)
    if (!matchingTier && sorted.length > 0) {
      return sorted[sorted.length - 1];
    }

    return matchingTier;
  }

  private static resolveAudioPricing(
    price: number | AudioPricing,
    hasAudio?: boolean
  ): number {
    if (typeof price === "number") {
      return price;
    }
    // Default to withoutAudio if not specified (current state)
    return hasAudio ? price.withAudio : price.withoutAudio;
  }

  private static roundCost(cost: number): number {
    // Round to 4 decimal places to avoid floating point errors
    return Math.round(cost * 10000) / 10000;
  }
}
