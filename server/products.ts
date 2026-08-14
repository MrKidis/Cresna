export const subscriptionPlans = {
  pro: {
    key: "pro",
    name: "Cresna Pro",
    monthlyAmount: 1900,
    annualAmount: 19000,
    currency: "usd",
    trialDays: 14,
    monthlyAiActions: 75,
  },
  growth: {
    key: "growth",
    name: "Cresna Growth",
    monthlyAmount: 4900,
    annualAmount: 49000,
    currency: "usd",
    trialDays: 14,
    monthlyAiActions: 300,
  },
} as const;

export type SubscriptionPlanKey = keyof typeof subscriptionPlans;
export type BillingInterval = "month" | "year";

export function getMonthlyAiActionLimit(input: { accessSource: "owner" | "beta" | "stripe" | "none"; plan: string | null }) {
  if (input.accessSource === "owner" || input.accessSource === "beta") return Number.POSITIVE_INFINITY;
  return input.plan === "growth" ? subscriptionPlans.growth.monthlyAiActions : subscriptionPlans.pro.monthlyAiActions;
}
