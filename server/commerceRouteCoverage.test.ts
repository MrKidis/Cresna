import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { commerceSignalContracts } from "./commerceSignalContract";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Cresna commerce route coverage", () => {
  it("registers every Shopify-inspired commerce destination", () => {
    const app = read("client/src/App.tsx");
    for (const route of ["orders", "drafts", "shipping", "products", "customers", "growth", "discounts", "content", "markets", "finance", "analytics"]) {
      expect(app).toContain(`path={\"/app/${route}\"}`);
    }
  });

  it("maps supported signals to evidence fields and preserves explicit unavailable markets", () => {
    for (const key of ["orders", "catalog", "customers", "pricing", "marketingContent"] as const) {
      const contract = commerceSignalContracts[key];
      expect(contract.availability).toBe("supported");
      expect(contract.route).toMatch(/^(analytics|catalog)\./);
      expect(contract.evidenceFields.length).toBeGreaterThan(0);
    }
    expect(commerceSignalContracts.markets.availability).toBe("unavailable");
    expect(commerceSignalContracts.markets.evidenceFields).toEqual([]);
  });

  it("keeps unsupported fulfillment, discounts, market, and publish behavior visible", () => {
    const app = read("client/src/App.tsx");
    const contract = read("server/commerceSignalContract.ts");
    const policy = read("server/merchantWritePolicy.ts");
    expect(app).toContain("ShippingModule");
    expect(app).toContain("DiscountsModule");
    expect(app).toContain("MarketsModule");
    expect(contract).toContain("will not invent");
    expect(policy).toContain("no configured publishing API");
  });
});
