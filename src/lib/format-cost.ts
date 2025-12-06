/**
 * Format cost with intelligent decimal precision:
 * - Always show at least 2 decimal places
 * - Show 3rd and 4th decimals only if non-zero
 * - Strip trailing zeros beyond 2nd decimal
 *
 * Examples:
 * - 0.5512 → $0.5512
 * - 0.881 → $0.881
 * - 0.35 → $0.35
 * - 0.7 → $0.70
 */
export function formatCost(cost: number | null | undefined): string {
  if (cost === null || cost === undefined) {
    return "N/A";
  }

  // Format to 4 decimals first
  const formatted = cost.toFixed(4);

  // Split into integer and decimal parts
  const [integer, decimals] = formatted.split(".");

  // Always keep at least 2 decimals
  let finalDecimals = decimals.slice(0, 2);

  // Add 3rd and 4th decimals if non-zero
  if (decimals[2] !== "0" || decimals[3] !== "0") {
    finalDecimals = decimals.slice(0, 4).replace(/0+$/, "");
  }

  return `$${integer}.${finalDecimals}`;
}
