import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import { buildShopifyAuthorizationUrl, isShopifyDisconnectTopic, validateShopDomain, verifyOAuthCallback } from "./shopify";

describe("Shopify authorization contract", () => {
  it("normalizes a valid myshopify domain and rejects arbitrary redirect domains", () => {
    expect(validateShopDomain("  Cedar-Store.myshopify.com ")).toBe("cedar-store.myshopify.com");
    expect(() => validateShopDomain("cedar-store.example.com")).toThrow("valid .myshopify.com domain");
  });

  it("creates the documented OAuth URL with minimal read-only scopes and a signed-state callback", () => {
    const url = new URL(buildShopifyAuthorizationUrl({ shopDomain: "cedar-store.myshopify.com", clientId: "client_123", origin: "https://cresna.example", state: "state_123" }));
    expect(url.origin).toBe("https://cedar-store.myshopify.com");
    expect(url.pathname).toBe("/admin/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client_123");
    expect(url.searchParams.get("scope")).toBe("read_orders,read_products,read_customers");
    expect(url.searchParams.get("redirect_uri")).toBe("https://cresna.example/api/shopify/callback");
    expect(url.searchParams.get("state")).toBe("state_123");
  });

  it("accepts a valid callback signature and rejects a tampered OAuth callback before install", () => {
    const secret = "shopify_test_secret";
    const unsigned = { code: "code_123", shop: "cedar-store.myshopify.com", state: "state_123", timestamp: "1786720000" };
    const message = Object.entries(unsigned).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("&");
    const hmac = createHmac("sha256", secret).update(message).digest("hex");
    expect(() => verifyOAuthCallback({ ...unsigned, hmac }, secret)).not.toThrow();
    expect(() => verifyOAuthCallback({ ...unsigned, hmac: "0".repeat(64) }, secret)).toThrow("Invalid Shopify authorization signature");
  });

  it("recognizes an app-uninstalled lifecycle event as a store-disconnect transition", () => {
    expect(isShopifyDisconnectTopic("app/uninstalled")).toBe(true);
    expect(isShopifyDisconnectTopic("orders/create")).toBe(false);
    expect(isShopifyDisconnectTopic(undefined)).toBe(false);
  });
});
