import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AIDraftStatusSummary } from "./AIDraftStatusSummary";

describe("AIDraftStatusSummary rendered contract", () => {
  it("renders evidence citations and unknown impact state", () => {
    const html = renderToStaticMarkup(<AIDraftStatusSummary draft={{ evidenceUsed: ["product.title"], estimatedImpact: { level: "unknown", rationale: "No measured outcome evidence is available." } }} />);
    expect(html).toContain("Evidence cited: product.title");
    expect(html).toContain("Estimated impact:");
    expect(html).toContain("unknown");
    expect(html).toContain("No measured outcome evidence is available.");
  });

  it("renders fallback next-step guidance", () => {
    const html = renderToStaticMarkup(<AIDraftStatusSummary draft={{ notes: ["Retry after the AI provider is available; Cresna has not published or changed your Shopify store."], estimatedImpact: { level: "unknown", rationale: "No generated draft or measured outcome evidence is available." } }} />);
    expect(html).toContain("Needs your input:");
    expect(html).toContain("Retry after the AI provider is available");
  });
});
