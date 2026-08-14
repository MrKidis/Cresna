import { describe, expect, it } from "vitest";
import { buildCheckoutSessionConfig, getUnpaidPreviewAccess, hasLiveStripeAccess, summarizeCurrentSubscriptions } from "./billing";

describe("Stripe Checkout configuration", () => {
  it("creates a subscription Checkout configuration with Cresna metadata and a fourteen-day trial", () => {
    const config = buildCheckoutSessionConfig({ user: { id: 42, email: "owner@example.com", name: "Owner" }, customerId: "cus_123", priceId: "price_123", origin: "https://cresna.example", planKey: "pro" });
    expect(config).toMatchObject({
      mode: "subscription",
      customer: "cus_123",
      client_reference_id: "42",
      payment_method_collection: "always",
      allow_promotion_codes: true,
      metadata: { user_id: "42", plan: "pro" },
      subscription_data: { trial_period_days: 14, trial_settings: { end_behavior: { missing_payment_method: "cancel" } }, metadata: { user_id: "42", plan: "pro" } },
      success_url: "https://cresna.example/app/billing?checkout=success",
      cancel_url: "https://cresna.example/app/billing?checkout=canceled",
    });
    expect(config.line_items).toEqual([{ price: "price_123", quantity: 1 }]);
  });

  it("counts only current trial and paid subscription records for owner aggregates", () => {
    expect(summarizeCurrentSubscriptions([
      { status: "trialing", plan: "pro" },
      { status: "active", plan: "growth" },
      { status: "active", plan: null },
    ])).toEqual({ activeSubscriptions: 2, trialingWorkspaces: 1, proSubscriptions: 1, growthSubscriptions: 1, unmappedSubscriptions: 1 });
  });

  it("exposes a server-authored no-access contract for the unpaid workspace preview", () => {
    expect(getUnpaidPreviewAccess()).toMatchObject({ hasAccess: false, accessSource: "none", previewMode: "unpaid", subscription: null });
  });

  it("revokes trial access when a trial cancellation is scheduled", () => {
    expect(hasLiveStripeAccess({ status: "trialing", cancel_at_period_end: true })).toBe(false);
    expect(hasLiveStripeAccess({ status: "trialing", cancel_at_period_end: false })).toBe(true);
    expect(hasLiveStripeAccess({ status: "active", cancel_at_period_end: true })).toBe(true);
  });
});
