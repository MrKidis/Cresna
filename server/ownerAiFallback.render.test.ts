import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OwnerAIFallbackNotice } from "../client/src/components/OwnerAIFallbackNotice";

describe("rendered owner AI fallback contract", () => {
  it("renders privacy-safe aggregate fallback copy after failure", () => {
    const html = renderToStaticMarkup(React.createElement(OwnerAIFallbackNotice, { visible: true }));
    expect(html).toContain("could not complete a narrative response");
    expect(html).toContain("verified aggregate platform snapshot");
    expect(html).toContain("no merchant-level records were accessed");
  });

  it("renders nothing when no failure is present", () => {
    expect(renderToStaticMarkup(React.createElement(OwnerAIFallbackNotice, { visible: false }))).toBe("");
  });
});
