import { describe, expect, it } from "vitest";
import { buildLinkedDraftMetadata, extractStructuredDraftText, parseStructuredDraft } from "./aiActionStudio";

describe("linked AI draft metadata", () => {
  it("propagates supported opportunity IDs into a catalog-content draft", () => {
    expect(buildLinkedDraftMetadata({ id: 42, category: "product_copy" })).toEqual({
      recommendationId: 42,
      eventPayload: { recommendationId: 42, recommendationCategory: "product_copy" },
    });
    expect(buildLinkedDraftMetadata({ id: 43, category: "pricing" }).recommendationId).toBe(43);
  });

  it("keeps standalone drafts unlinked and blocks operational recommendation types", () => {
    expect(buildLinkedDraftMetadata()).toEqual({ recommendationId: null, eventPayload: {} });
    expect(() => buildLinkedDraftMetadata({ id: 9, category: "high_refunds" })).toThrow("operational merchant action");
  });
});

describe("structured AI draft output", () => {
  it("accepts multipart text and fenced JSON from a compatible model response", () => {
    const content = [{ type: "text", text: "```json\n{\"positioning\":\"Useful\"}\n```" }];
    expect(extractStructuredDraftText(content)).toBe('{"positioning":"Useful"}');
    expect(parseStructuredDraft(content, "failed")).toEqual({ positioning: "Useful" });
  });
});
