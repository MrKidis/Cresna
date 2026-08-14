import { describe, expect, it } from "vitest";
import { subscriptionPlans } from "./products";

describe("Stripe subscription catalog", () => {
  it("uses a fourteen-day trial and an annual price equal to ten monthly periods", () => {
    for (const plan of Object.values(subscriptionPlans)) {
      expect(plan.trialDays).toBe(14);
      expect(plan.annualAmount).toBe(plan.monthlyAmount * 10);
      expect(plan.currency).toBe("usd");
    }
  });
});
