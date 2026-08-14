export const subscriptionPlans = {
  pro: {
    key: "pro",
    name: "Cresna Pro",
    monthlyAmount: 2900,
    annualAmount: 29000,
    currency: "usd",
    trialDays: 14,
  },
  growth: {
    key: "growth",
    name: "Cresna Growth",
    monthlyAmount: 7900,
    annualAmount: 79000,
    currency: "usd",
    trialDays: 14,
  },
} as const;

export type SubscriptionPlanKey = keyof typeof subscriptionPlans;
export type BillingInterval = "month" | "year";
