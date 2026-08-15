import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readClientPage = (name: string) => readFileSync(resolve(process.cwd(), "client/src/pages", name), "utf8");

describe("AI route UI contracts", () => {
  it("keeps merchant AI progress, evidence, and honest impact copy visible", () => {
    const source = readClientPage("AIStudio.tsx");
    expect(source).toContain("Building a reviewable draft");
    expect(source).toContain("cite the source fields it used");
    expect(source).toContain("Nothing is sent to Shopify automatically.");
  });

  it("keeps owner AI aggregate-only, loading, and empty-state boundaries visible", () => {
    const source = readClientPage("OwnerPanel.tsx");
    expect(source).toContain("Only the configured owner identity can open this space");
    expect(source).toContain("aggregate-only");
    expect(source).toContain("Reviewing the verified aggregate platform snapshot");
    expect(source).toContain("Ask a question about the aggregate Cresna platform snapshot.");
    expect(source).toContain("AI response is aggregate-only");
  });
});
