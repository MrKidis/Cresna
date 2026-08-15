export const subscriptionPlans = {
  pro: {
    key: "pro",
    name: "Cresna Pro",
    monthlyAmount: 1900,
    annualAmount: 19000,
    currency: "usd",
    trialDays: 14,
    monthlyAiActions: 500,
  },
  growth: {
    key: "growth",
    name: "Cresna Growth",
    monthlyAmount: 4900,
    annualAmount: 49000,
    currency: "usd",
    trialDays: 14,
    monthlyAiActions: 2500,
  },
} as const;

export const freePlan = {
  key: "free",
  name: "Cresna Free",
  monthlyAiActions: 10,
} as const;

export type SubscriptionPlanKey = keyof typeof subscriptionPlans;
export type BillingInterval = "month" | "year";

export function getMonthlyAiActionLimit(input: { accessSource: AccessSource; plan: string | null }) {
  if (input.accessSource === "owner" || input.accessSource === "beta") return Number.POSITIVE_INFINITY;
  if (input.accessSource === "free") return freePlan.monthlyAiActions;
  if (input.accessSource === "none") return 0;
  return input.plan === "growth" ? subscriptionPlans.growth.monthlyAiActions : subscriptionPlans.pro.monthlyAiActions;
}
import type { AccessSource } from "./accessRules.ts";
