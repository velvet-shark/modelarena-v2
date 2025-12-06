// Pricing configuration types for video generation models

export type PricingModel =
  | "per-second"
  | "base-plus-per-second"
  | "flat-rate"
  | "resolution-dependent";

/**
 * Audio-based pricing variants
 */
export interface AudioPricing {
  withAudio: number;
  withoutAudio: number;
}

/**
 * Resolution tier for resolution-dependent pricing
 */
export interface ResolutionTier {
  maxWidth: number; // e.g., 1280 for 720p
  maxHeight: number; // e.g., 720
  price: number; // cost per second or flat
}

/**
 * Base pricing configuration
 */
export interface BasePricingConfig {
  model: PricingModel;
  currency?: "USD"; // Future: support other currencies
  isEstimated?: boolean; // Flag for estimated pricing
}

/**
 * Per-second pricing: cost = duration × pricePerSecond
 */
export interface PerSecondPricing extends BasePricingConfig {
  model: "per-second";
  pricePerSecond: number | AudioPricing;
}

/**
 * Base + per-second pricing: cost = basePrice + (extraSeconds × pricePerExtraSecond)
 */
export interface BasePlusPerSecondPricing extends BasePricingConfig {
  model: "base-plus-per-second";
  basePrice: number; // e.g., $0.21
  baseDuration: number; // e.g., 5 seconds
  pricePerExtraSecond: number | AudioPricing;
}

/**
 * Flat rate per generation (regardless of duration)
 */
export interface FlatRatePricing extends BasePricingConfig {
  model: "flat-rate";
  price: number;
}

/**
 * Resolution-dependent pricing (tiered by resolution)
 */
export interface ResolutionDependentPricing extends BasePricingConfig {
  model: "resolution-dependent";
  tiers: ResolutionTier[];
  pricingType: "per-second" | "flat-rate";
}

/**
 * Union type for all pricing configurations
 */
export type PricingConfig =
  | PerSecondPricing
  | BasePlusPerSecondPricing
  | FlatRatePricing
  | ResolutionDependentPricing;

/**
 * Generation context for cost calculation
 */
export interface CostCalculationContext {
  duration: number; // actual video duration in seconds
  width?: number; // video width in pixels
  height?: number; // video height in pixels
  hasAudio?: boolean; // whether video has audio track
  additionalParams?: Record<string, unknown>;
}

/**
 * Result of cost calculation
 */
export interface CostCalculationResult {
  cost: number;
  breakdown?: {
    basePrice?: number;
    variablePrice?: number;
    tier?: string;
  };
  error?: string;
}
