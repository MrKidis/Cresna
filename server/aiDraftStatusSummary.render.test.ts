import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AIDraftStatusSummary } from "../client/src/components/AIDraftStatusSummary";
import { MerchantAILoadingSummary } from "../client/src/components/MerchantAILoadingSummary";

describe("rendered merchant AI status contract", () => {
  it("renders the merchant progress announcement", () => {
    const html = renderToStaticMarkup(React.createElement(MerchantAILoadingSummary, { isLoading: true }));
    expect(html).toContain("Reading verified store evidence and drafting a reviewable action");
  });
  it("renders evidence citations and unknown impact state", () => {
    const html = renderToStaticMarkup(React.createElement(AIDraftStatusSummary, { draft: { evidenceUsed: ["product.title"], estimatedImpact: { level: "unknown", rationale: "No measured outcome evidence is available." } } }));
    expect(html).toContain("Evidence cited: product.title");
    expect(html).toContain("Estimated impact:");
    expect(html).toContain("unknown");
  });

  it("renders fallback next-step guidance", () => {
    const html = renderToStaticMarkup(React.createElement(AIDraftStatusSummary, { draft: { notes: ["Retry after the AI provider is available; Cresna has not published or changed your Shopify store."], estimatedImpact: { level: "unknown", rationale: "No generated draft or measured outcome evidence is available." } } }));
    expect(html).toContain("Needs your input:");
    expect(html).toContain("Retry after the AI provider is available");
  });
});
