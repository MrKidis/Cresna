export const subscriptionPlans = {
  pro: {
    key: "pro",
    name: "Cresna Pro",
    monthlyAmount: 1900,
    annualAmount: 19000,
    currency: "usd",
    trialDays: 14,
  },
  growth: {
    key: "growth",
    name: "Cresna Growth",
    monthlyAmount: 4900,
    annualAmount: 49000,
    currency: "usd",
    trialDays: 14,
  },
} as const;

export type SubscriptionPlanKey = keyof typeof subscriptionPlans;
export type BillingInterval = "month" | "year";
