import { describe, expect, it } from "vitest";
import { hasValidRevenueCatAuthorization, isRevenueCatWebhookEnabled, mapRevenueCatWebhookEvent } from "./revenueCatWebhook";

describe("RevenueCat webhook contract", () => {
  it("stays disabled without a configured authorization value and rejects mismatched values", () => {
    expect(isRevenueCatWebhookEnabled("")).toBe(false);
    expect(hasValidRevenueCatAuthorization("secret", "")).toBe(false);
    expect(hasValidRevenueCatAuthorization("wrong", "secret")).toBe(false);
    expect(hasValidRevenueCatAuthorization("secret", "secret")).toBe(true);
  });

  it("maps only Cresna entitlements and marks cancellation events as inactive", () => {
    expect(mapRevenueCatWebhookEvent({ type: "INITIAL_PURCHASE", app_user_id: "merchant_1", entitlement_ids: ["cresna_growth"], expiration_at_ms: 1_800_000_000_000 })).toMatchObject({ appUserId: "merchant_1", entitlement: "cresna_growth", plan: "growth", active: true });
    expect(mapRevenueCatWebhookEvent({ type: "CANCELLATION", app_user_id: "merchant_1", entitlement_ids: ["cresna_pro"] })).toMatchObject({ plan: "pro", active: false });
    expect(mapRevenueCatWebhookEvent({ type: "INITIAL_PURCHASE", app_user_id: "merchant_1", entitlement_ids: ["marginecho_legacy"] })).toMatchObject({ plan: null, active: false });
  });
});
