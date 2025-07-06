/**
 * Platform Fee Calculator
 * 
 * Calculates platform fees based on order value using a tiered structure
 */

export interface PlatformFeeTier {
  minAmount: number;
  maxAmount: number;
  fee: number;
}

/**
 * Platform fee tiers based on order value (in RWF)
 */
export const PLATFORM_FEE_TIERS: PlatformFeeTier[] = [
  { minAmount: 0, maxAmount: 1500, fee: 50 },
  { minAmount: 1501, maxAmount: 2500, fee: 100 },
  { minAmount: 2501, maxAmount: 5000, fee: 150 },
  { minAmount: 5001, maxAmount: 10000, fee: 350 },
  { minAmount: 10001, maxAmount: 50000, fee: 500 },
  { minAmount: 50001, maxAmount: 100000, fee: 1500 },
  { minAmount: 100001, maxAmount: 500000, fee: 4500 },
  { minAmount: 500001, maxAmount: 1000000, fee: 9500 },
];

/**
 * Calculate platform fee based on order subtotal
 * 
 * @param subtotal - Order subtotal in RWF
 * @returns Platform fee in RWF
 */
export function calculatePlatformFee(subtotal: number): number {
  // Handle edge cases
  if (subtotal <= 0) {
    return PLATFORM_FEE_TIERS[0].fee; // Minimum fee
  }

  // Handle amounts above maximum tier
  if (subtotal > 1000000) {
    return PLATFORM_FEE_TIERS[PLATFORM_FEE_TIERS.length - 1].fee; // Maximum fee
  }

  // Find the appropriate tier
  const tier = PLATFORM_FEE_TIERS.find(
    (tier) => subtotal >= tier.minAmount && subtotal <= tier.maxAmount
  );

  if (!tier) {
    // Fallback to minimum fee if no tier found (shouldn't happen with proper tiers)
    console.warn(`No platform fee tier found for amount: ${subtotal}`);
    return PLATFORM_FEE_TIERS[0].fee;
  }

  return tier.fee;
}

/**
 * Get platform fee tier information for a given amount
 * 
 * @param subtotal - Order subtotal in RWF
 * @returns Tier information including fee and range
 */
export function getPlatformFeeTier(subtotal: number): PlatformFeeTier | null {
  if (subtotal <= 0) return null;

  if (subtotal > 1000000) {
    return PLATFORM_FEE_TIERS[PLATFORM_FEE_TIERS.length - 1];
  }

  return PLATFORM_FEE_TIERS.find(
    (tier) => subtotal >= tier.minAmount && subtotal <= tier.maxAmount
  ) || null;
}

/**
 * Get all platform fee tiers (for display purposes)
 * 
 * @returns Array of all platform fee tiers
 */
export function getAllPlatformFeeTiers(): PlatformFeeTier[] {
  return PLATFORM_FEE_TIERS;
}

/**
 * Format platform fee tier for display
 * 
 * @param tier - Platform fee tier
 * @returns Formatted string representation
 */
export function formatPlatformFeeTier(tier: PlatformFeeTier): string {
  const minFormatted = tier.minAmount.toLocaleString('en-US');
  const maxFormatted = tier.maxAmount === 1000000 
    ? "1,000,000+" 
    : tier.maxAmount.toLocaleString('en-US');
  const feeFormatted = tier.fee.toLocaleString('en-US');
  
  return `Order between ${minFormatted} and ${maxFormatted} RWF: ${feeFormatted} RWF`;
} 