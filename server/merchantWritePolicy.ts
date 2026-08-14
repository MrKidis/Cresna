export type MerchantWriteOperation = "product_content_publish" | "positioning_publish";

export function merchantWriteOperationForDraft(actionType: "product_description" | "positioning"): MerchantWriteOperation {
  return actionType === "product_description" ? "product_content_publish" : "positioning_publish";
}

export function merchantWriteAvailability() {
  return {
    available: false,
    reason: "Cresna currently has read-only Shopify scopes and no configured publishing API.",
  } as const;
}

export function assertMerchantWriteApprovalEligible(input: { workspaceOwnsDraft: boolean; draftStatus: "generated" | "approved" | "rejected" }) {
  if (!input.workspaceOwnsDraft) throw new Error("AI draft not found in this workspace");
  if (input.draftStatus !== "approved") throw new Error("Approve the AI draft direction before recording a write approval");
}
