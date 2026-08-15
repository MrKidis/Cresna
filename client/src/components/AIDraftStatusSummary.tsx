import React from "react";

type DraftStatus = {
  notes?: string[];
  missingEvidence?: string[];
  evidenceUsed?: string[];
  estimatedImpact?: { level: "low" | "medium" | "high" | "unknown"; rationale: string };
};

export function AIDraftStatusSummary({ draft }: { draft: DraftStatus }) {
  const missing = draft.notes || draft.missingEvidence || [];
  return <div className="mt-3 space-y-2 text-[11px] leading-5 text-[#c7d0cb]">
    {missing.length ? <p>Needs your input: {missing.join(" ")}</p> : null}
    {draft.estimatedImpact ? <p>Estimated impact: <strong className="text-[#f8f7f2]">{draft.estimatedImpact.level}</strong> — {draft.estimatedImpact.rationale}</p> : null}
    {draft.evidenceUsed?.length ? <p>Evidence cited: {draft.evidenceUsed.join(", ")}</p> : null}
  </div>;
}
