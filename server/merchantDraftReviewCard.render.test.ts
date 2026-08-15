import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MerchantDraftReviewCard } from "../client/src/components/MerchantDraftReviewCard";

describe("route-owned merchant draft review", () => {
  it("renders realistic evidence, unknown impact, and actionable next steps", () => {
    const html = renderToStaticMarkup(React.createElement(MerchantDraftReviewCard, {
      draft: {
        descriptionHtml: "<p>Grounded product copy</p>",
        evidenceUsed: ["product.title", "businessBrain.brandVoice"],
        estimatedImpact: { level: "unknown", rationale: "No measured outcome evidence is available." },
        notes: ["Review the draft against your current product facts before publishing."],
      },
    }));
    expect(html).toContain("Evidence cited: product.title, businessBrain.brandVoice");
    expect(html).toContain("Estimated impact:");
    expect(html).toContain("unknown");
    expect(html).toContain("Review the draft against your current product facts");
  });
});
