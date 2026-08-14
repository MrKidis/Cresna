import { describe, expect, it } from "vitest";

const authorization = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
const baseUrl = process.env.REVENUECAT_WEBHOOK_TEST_URL || "http://127.0.0.1:3000";

describe("RevenueCat webhook live authorization", () => {
  it("accepts the configured authorization for a safely ignored legacy entitlement event", async () => {
    expect(authorization).toBeTruthy();
    const response = await fetch(`${baseUrl}/api/revenuecat/webhook`, {
      method: "POST",
      headers: { authorization: authorization!, "content-type": "application/json" },
      body: JSON.stringify({ event: { type: "INITIAL_PURCHASE", app_user_id: "cresna_live_secret_probe", entitlement_ids: ["marginecho_legacy"] } }),
    });
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ received: true, ignored: "unknown_or_legacy_entitlement" });
  }, 15_000);
});
