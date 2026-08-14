import { describe, expect, it } from "vitest";
import { buildCatalogCandidates } from "./recommendationEngine";
import { calculateGrowthScore } from "./storeIntelligence";

describe("Cresna Growth Score", () => {
  it("reports needs-more-data instead of creating a score from absent evidence", () => {
    const result = calculateGrowthScore({ products: [], collections: [], dailyMetrics: [], profile: undefined });

    expect(result.status).toBe("needs_more_data");
    expect(result.overallScore).toBeNull();
    expect(result.coveragePercent).toBe(0);
  });

  it("scores only available catalog, commerce, offer, and approved-brand components", () => {
    const result = calculateGrowthScore({
      products: [{ status: "ACTIVE", descriptionHtml: "A detailed and factual product description that exceeds the catalog clarity threshold for Cresna.", seoTitle: "Product title", seoDescription: "A factual SEO description.", mediaCount: 2, totalInventory: 5 }],
      collections: [{ descriptionHtml: "A useful collection description that exceeds the stored catalog threshold.", seoTitle: "Collection", seoDescription: "Collection description", productCount: 1 }],
      dailyMetrics: Array.from({ length: 7 }, () => ({ orderCount: 5, refundCount: 0, checkoutCount: 5, abandonedCheckoutCount: 0 })),
      profile: { goalsJson: '["more_sales"]', brandSummary: "Useful home goods", targetCustomer: "Home cooks", brandVoice: "Warm", positioning: "Functional tools for small kitchens", differentiators: "Repairable materials", brandValues: "Honesty" },
    });

    expect(result.status).toBe("ready");
    expect(result.overallScore).toBeGreaterThan(70);
    expect(result.components.every(component => component.available)).toBe(true);
  });
});

describe("Cresna catalog opportunities", () => {
  it("creates evidence-backed content opportunities with no invented revenue estimate", () => {
    const candidates = buildCatalogCandidates([
      { id: 1, status: "ACTIVE", title: "Canvas Tote", descriptionHtml: "", seoTitle: null, seoDescription: null, mediaCount: 0 },
    ] as never);

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every(candidate => candidate.category === "product_copy")).toBe(true);
    expect(candidates.every(candidate => candidate.maximumImpact === 0 && candidate.impactKnown === false)).toBe(true);
  });

  it("flags actual compare-at-price evidence without claiming a revenue estimate", () => {
    const candidates = buildCatalogCandidates([
      { id: 1, status: "ACTIVE", title: "Canvas Tote", descriptionHtml: "A detailed product description with sufficient copy for this catalog scan.", seoTitle: "Canvas Tote", seoDescription: "Durable canvas carry bag.", mediaCount: 2, priceMin: "18.00", priceMax: "18.00", compareAtPriceMin: "24.00", compareAtPriceMax: "24.00" },
    ] as never);

    expect(candidates.some(candidate => candidate.category === "pricing")).toBe(true);
    expect(candidates.filter(candidate => candidate.category === "pricing").every(candidate => candidate.maximumImpact === 0 && candidate.impactKnown === false)).toBe(true);
  });
});
