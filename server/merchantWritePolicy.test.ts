import { describe, expect, it } from "vitest";
import { assertMerchantWriteApprovalEligible, merchantWriteAvailability, merchantWriteOperationForDraft } from "./merchantWritePolicy";

describe("merchant write policy", () => {
  it("maps only supported draft types to explicit future write intents and remains unavailable", () => {
    expect(merchantWriteOperationForDraft("product_description")).toBe("product_content_publish");
    expect(merchantWriteOperationForDraft("positioning")).toBe("positioning_publish");
    expect(merchantWriteAvailability()).toEqual({ available: false, reason: "Cresna currently has read-only Shopify scopes and no configured publishing API." });
  });

  it("rejects a write approval for another workspace or for a draft without merchant direction approval", () => {
    expect(() => assertMerchantWriteApprovalEligible({ workspaceOwnsDraft: false, draftStatus: "approved" })).toThrow("AI draft not found in this workspace");
    expect(() => assertMerchantWriteApprovalEligible({ workspaceOwnsDraft: true, draftStatus: "generated" })).toThrow("Approve the AI draft direction");
    expect(() => assertMerchantWriteApprovalEligible({ workspaceOwnsDraft: true, draftStatus: "approved" })).not.toThrow();
  });
});
