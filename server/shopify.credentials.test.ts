import { describe, expect, it } from "vitest";

describe("Shopify OAuth credential configuration", () => {
  it("exposes non-empty server-only credentials for the Shopify authorization endpoint", () => {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    expect(clientId, "SHOPIFY_CLIENT_ID must be configured").toBeTypeOf("string");
    expect(clientId?.trim().length, "SHOPIFY_CLIENT_ID must not be empty").toBeGreaterThan(0);
    expect(clientSecret, "SHOPIFY_CLIENT_SECRET must be configured").toBeTypeOf("string");
    expect(clientSecret?.trim().length, "SHOPIFY_CLIENT_SECRET must not be empty").toBeGreaterThan(0);

    const authorizationEndpoint = new URL("https://example.myshopify.com/admin/oauth/authorize");
    authorizationEndpoint.searchParams.set("client_id", clientId!);
    authorizationEndpoint.searchParams.set("scope", "read_orders,read_products,read_customers");
    expect(authorizationEndpoint.toString()).toContain("client_id=");
  });
});
