import { describe, expect, it } from "vitest";
import { buildCandidates, rankCandidates } from "./recommendationEngine";

describe("recommendation evidence eligibility", () => {
  it("only surfaces categories supported by the supplied aggregate signals", () => {
    const candidates = buildCandidates({
      store: { currency: "USD" },
      dailyMetrics: Array.from({ length: 7 }, (_, index) => ({
        metricDate: new Date(Date.UTC(2026, 0, index + 1)),
        netRevenue: "100.00",
        checkoutCount: 10,
        abandonedCheckoutCount: 3,
      })),
      productMetrics: [{
        id: 1,
        shopifyProductId: "gid://shopify/Product/1",
        title: "Measured product",
        sku: "MP-1",
        orderCount: 10,
        unitsSold: 12,
        refundCount: 2,
        grossRevenue: "100.00",
        costEstimate: "80.00",
        refundAmount: "20.00",
      }],
    } as never);

    const categories = candidates.map(candidate => candidate.category);
    expect(categories).toContain("abandoned_cart");
    expect(categories).toContain("high_refunds");
    expect(categories).toContain("margin_erosion");
    expect(categories).toContain("restock");
    expect(candidates.every(candidate => candidate.maximumImpact >= 0)).toBe(true);
  });

  it("does not recommend actions when fewer than seven reporting days exist", () => {
    const candidates = buildCandidates({ store: { currency: "USD" }, dailyMetrics: [], productMetrics: [] } as never);
    expect(candidates).toEqual([]);
  });

  it("ranks higher estimated-impact opportunities first", () => {
    const ranked = rankCandidates([
      { category: "restock", evidence: "A", maximumImpact: 15, effortLevel: "low" },
      { category: "high_refunds", evidence: "B", maximumImpact: 85, effortLevel: "medium" },
      { category: "margin_erosion", evidence: "C", maximumImpact: 40, effortLevel: "medium" },
    ]);
    expect(ranked.map(candidate => candidate.maximumImpact)).toEqual([85, 40, 15]);
  });
});
