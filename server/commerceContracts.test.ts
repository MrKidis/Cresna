import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hasRequiredShopifyReadScopes } from "./shopify";
import { commerceSignalContracts } from "./commerceSignalContract";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("connected commerce intelligence contract", () => {
  it("requires the actual read scopes used by the sync pipeline", () => {
    expect(hasRequiredShopifyReadScopes("read_orders,read_products,read_customers")).toBe(true);
    expect(hasRequiredShopifyReadScopes("read_orders,read_products")).toBe(false);
  });

  it("contains evidence-backed query and storage coverage for supported signals", () => {
    const shopify = read("server/shopify.ts");
    const schema = read("drizzle/schema.ts");
    for (const marker of ["query Orders", "query Products", "query Collections", "query Abandoned"]) expect(shopify).toContain(marker);
    for (const marker of ["netRevenue", "orderCount", "customerCount", "abandonedCheckoutCount", "priceRangeV2"]) expect(schema + shopify).toContain(marker);
  });

  it("defines every claimed signal route and keeps markets unavailable", () => {
    expect(Object.keys(commerceSignalContracts)).toEqual(["orders", "catalog", "customers", "pricing", "marketingContent", "markets"]);
    for (const key of ["orders", "catalog", "customers", "pricing", "marketingContent"] as const) {
      expect(commerceSignalContracts[key].availability).toBe("supported");
      expect(commerceSignalContracts[key].route.length).toBeGreaterThan(0);
      expect(commerceSignalContracts[key].evidenceFields.length).toBeGreaterThan(0);
    }
    expect(commerceSignalContracts.markets.availability).toBe("unavailable");
    expect(commerceSignalContracts.markets.reason).toContain("will not invent");
  });

  it("keeps unsupported write/market behavior explicit instead of fabricating access", () => {
    const writePolicy = read("server/merchantWritePolicy.ts");
    const connect = read("client/src/pages/ConnectStore.tsx");
    expect(writePolicy).toContain("no configured publishing API");
    expect(connect).toContain("Orders:");
    expect(connect).toContain("Products:");
    expect(connect).toContain("Customers:");
    expect(connect).toContain("no customer-facing messaging");
  });
});
