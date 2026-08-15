import { describe, expect, it, vi } from "vitest";
import { invokeLLM } from "./_core/llm";
import { buildLinkedDraftMetadata, buildMerchantAiFallback, buildMerchantAiMessages, extractStructuredDraftText, parseStructuredDraft } from "./aiActionStudio";

describe("merchant AI fallback behavior", () => {
  it("returns a truthful product fallback with unknown impact and source fields", () => {
    const fallback = buildMerchantAiFallback("product_description", { product: { title: "Field jacket", vendor: "Northline" }, businessBrain: { brandVoice: "Direct" } });
    expect(fallback.estimatedImpact).toEqual({ level: "unknown", rationale: "No generated draft or measured outcome evidence is available." });
    expect(fallback.evidenceUsed).toEqual(["product.title", "product.vendor", "businessBrain.brandVoice"]);
    expect(fallback.notes?.[0]).toContain("has not published or changed your Shopify store");
  });

  it("returns a truthful positioning fallback with a next step", () => {
    const fallback = buildMerchantAiFallback("positioning", { businessBrain: { positioning: "Utility-first" } });
    expect(fallback.missingEvidence?.[0]).toContain("Retry after the AI provider is available");
    expect(fallback.estimatedImpact?.level).toBe("unknown");
  });
});

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
  it("uses evidence-bound OpenRouter messages for both merchant draft types", () => {
    const productMessages = buildMerchantAiMessages("product_description", { product: { title: "Field jacket" } });
    const positioningMessages = buildMerchantAiMessages("positioning", { businessBrain: { positioning: "Utility-first" } });
    expect(productMessages[0].content).toContain("Do not invent");
    expect(productMessages[0].content).toContain("evidenceUsed");
    expect(productMessages[1].content).toContain("Field jacket");
    expect(positioningMessages[1].content).toContain("Utility-first");
  });

  it("routes evidence messages through the shared tool-capable LLM transport", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ descriptionHtml: "<p>Grounded</p>" }) } }] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await invokeLLM({
      messages: buildMerchantAiMessages("product_description", { product: { title: "Field jacket" } }),
      tools: [{ type: "function", function: { name: "read_connected_store_snapshot", parameters: { type: "object", properties: {} } } }],
      toolChoice: "auto",
    });
    expect(response.choices[0]?.message.content).toContain("Grounded");
    const [, request] = fetchMock.mock.calls[0] || [];
    expect(String(request?.body)).toContain("Field jacket");
    expect(String(request?.body)).toContain("read_connected_store_snapshot");
    vi.unstubAllGlobals();
  });

  it("accepts multipart text and fenced JSON from a compatible model response", () => {
    const content = [{ type: "text", text: "```json\n{\"positioning\":\"Useful\"}\n```" }];
    expect(extractStructuredDraftText(content)).toBe('{"positioning":"Useful"}');
    expect(parseStructuredDraft(content, "failed")).toEqual({ positioning: "Useful" });
  });

  it("preserves explicit source-field citations in a reviewable draft", () => {
    const content = '{"descriptionHtml":"<p>Useful</p>","evidenceUsed":["product.title","businessBrain.brandVoice"],"estimatedImpact":{"level":"unknown","rationale":"No measured outcome evidence was supplied."}}';
    expect(parseStructuredDraft(content, "failed")).toMatchObject({
      evidenceUsed: ["product.title", "businessBrain.brandVoice"],
      estimatedImpact: { level: "unknown", rationale: "No measured outcome evidence was supplied." },
    });
  });
});
