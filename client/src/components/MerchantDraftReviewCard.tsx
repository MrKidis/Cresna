import React from "react";
import { AIDraftStatusSummary } from "@/components/AIDraftStatusSummary";

type ParsedDraft = { descriptionHtml?: string; positioning?: string; evidenceUsed?: string[]; notes?: string[]; estimatedImpact?: { level: "low" | "medium" | "high" | "unknown"; rationale: string } };

export function MerchantDraftReviewCard({ draft }: { draft: ParsedDraft }) {
  return <div aria-label="Merchant AI draft review"><AIDraftStatusSummary draft={draft} /></div>;
}
