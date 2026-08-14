import type { SubscriptionPlanKey } from "./products";

/**
 * Logical identifiers prepared in RevenueCat. These values are not payment credentials
 * and do not activate RevenueCat until the owner connects a Stripe Web configuration,
 * products, packages, a webhook secret, and a verified purchase flow.
 */
export const revenueCatContract = {
  offering: "cresna_default",
  entitlements: {
    pro: "cresna_pro",
    growth: "cresna_growth",
  },
  packages: {
    proMonthly: "cresna_pro_monthly",
    proAnnual: "cresna_pro_annual",
    growthMonthly: "cresna_growth_monthly",
    growthAnnual: "cresna_growth_annual",
  },
} as const;

export function planFromRevenueCatEntitlement(identifier: string | null | undefined): SubscriptionPlanKey | null {
  if (identifier === revenueCatContract.entitlements.pro) return "pro";
  if (identifier === revenueCatContract.entitlements.growth) return "growth";
  return null;
}
