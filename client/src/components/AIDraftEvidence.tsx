import { Braces } from "lucide-react";

type DraftEvidenceProps = {
  drafts: Array<{ draft: { id: number; actionType: string }; parsedDraft: { evidenceUsed?: string[] } | null }>;
};

export function AIDraftEvidence({ drafts }: DraftEvidenceProps) {
  const citedDrafts = drafts.map(item => ({
    id: item.draft.id,
    label: item.draft.actionType === "positioning" ? "Positioning draft" : "Product draft",
    fields: item.parsedDraft?.evidenceUsed || [],
  })).filter(item => item.fields.length > 0).slice(0, 4);

  if (!citedDrafts.length) return null;
  return <section className="mt-5 rounded-[1.35rem] border border-border bg-card p-6 text-card-foreground sm:p-7"><div className="flex items-center gap-2"><Braces className="h-4 w-4 text-primary" /><p className="eyebrow text-[10px] text-muted-foreground">Draft evidence citations</p></div><h2 className="mt-2 text-xl font-extrabold tracking-[-0.05em]">See the context Cresna used.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">These are the connected catalog or approved Business Brain fields cited by the AI when it formed each reviewable draft. Missing facts should appear as a request for your input, not as a claim.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{citedDrafts.map(draft => <article key={draft.id} className="rounded-xl border border-border bg-secondary/60 p-4"><p className="text-xs font-bold">{draft.label}</p><div className="mt-3 flex flex-wrap gap-2">{draft.fields.map(field => <code key={field} className="rounded-md bg-background px-2 py-1 text-[10px] font-bold text-foreground">{field}</code>)}</div></article>)}</div></section>;
}
