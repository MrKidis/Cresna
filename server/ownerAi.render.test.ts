import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OwnerAIStatusSummary } from "../client/src/components/OwnerAIStatusSummary";

describe("rendered owner AI contract", () => {
  it("renders the verified aggregate loading state", () => {
    const html = renderToStaticMarkup(React.createElement(OwnerAIStatusSummary, { isLoading: true, emptyStateMessage: "Ask a question about the aggregate Cresna platform snapshot." }));
    expect(html).toContain("Reviewing the verified aggregate platform snapshot");
  });

  it("renders the aggregate-only empty state", () => {
    const html = renderToStaticMarkup(React.createElement(OwnerAIStatusSummary, { isLoading: false, emptyStateMessage: "Ask a question about the aggregate Cresna platform snapshot." }));
    expect(html).toContain("Ask a question about the aggregate Cresna platform snapshot");
  });
});
