import { describe, expect, it } from "vitest";
import { buildCheckoutSessionConfig } from "./billing";

describe("Stripe Checkout configuration", () => {
  it("creates a subscription Checkout configuration with Cresna metadata and a fourteen-day trial", () => {
    const config = buildCheckoutSessionConfig({ user: { id: 42, email: "owner@example.com", name: "Owner" }, customerId: "cus_123", priceId: "price_123", origin: "https://cresna.example", planKey: "pro" });
    expect(config).toMatchObject({
      mode: "subscription",
      customer: "cus_123",
      client_reference_id: "42",
      allow_promotion_codes: true,
      metadata: { user_id: "42", plan: "pro" },
      subscription_data: { trial_period_days: 14, metadata: { user_id: "42", plan: "pro" } },
      success_url: "https://cresna.example/app/billing?checkout=success",
      cancel_url: "https://cresna.example/app/billing?checkout=canceled",
    });
    expect(config.line_items).toEqual([{ price: "price_123", quantity: 1 }]);
  });
});
