import { describe, expect, it } from "vitest";
import { freePlan, getMonthlyAiActionLimit, subscriptionPlans } from "./products";

describe("Stripe subscription catalog", () => {
  it("uses a fourteen-day trial and an annual price equal to ten monthly periods", () => {
    for (const plan of Object.values(subscriptionPlans)) {
      expect(plan.trialDays).toBe(14);
      expect(plan.annualAmount).toBe(plan.monthlyAmount * 10);
      expect(plan.currency).toBe("usd");
    }
  });

  it("keeps the launch prices at $19 for Pro and $49 for Growth", () => {
    expect(subscriptionPlans.pro.monthlyAmount).toBe(1900);
    expect(subscriptionPlans.pro.annualAmount).toBe(19000);
    expect(subscriptionPlans.growth.monthlyAmount).toBe(4900);
    expect(subscriptionPlans.growth.annualAmount).toBe(49000);
  });

  it("provides materially higher monthly AI-action capacity while preserving unrestricted owner and beta access", () => {
    expect(subscriptionPlans.pro.monthlyAiActions).toBe(500);
    expect(subscriptionPlans.growth.monthlyAiActions).toBe(2500);
    expect(freePlan.monthlyAiActions).toBe(10);
    expect(getMonthlyAiActionLimit({ accessSource: "stripe", plan: "pro" })).toBe(500);
    expect(getMonthlyAiActionLimit({ accessSource: "stripe", plan: "growth" })).toBe(2500);
    expect(getMonthlyAiActionLimit({ accessSource: "free", plan: "Free" })).toBe(10);
    expect(getMonthlyAiActionLimit({ accessSource: "owner", plan: "Growth" })).toBe(Number.POSITIVE_INFINITY);
  });
});
