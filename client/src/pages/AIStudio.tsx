import { EmptyWorkspaceCard, UnpaidWorkspaceState, WorkspaceFrame } from "@/components/WorkspaceFrame";
import { useUnpaidPreview } from "@/contexts/UnpaidPreviewContext";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Check, Copy, FileText, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function textOnly(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function AIStudio() {
  const { isUnpaidPreview, isCheckingPreview } = useUnpaidPreview();
  const [location] = useLocation();
  const { data: catalog, isLoading: catalogLoading } = trpc.catalog.products.useQuery();
  const { data: intelligence } = trpc.intelligence.overview.useQuery();
  const { data: drafts, isLoading: draftsLoading } = trpc.aiActions.list.useQuery();
  const { data: writeApprovals } = trpc.aiActions.writeApprovals.useQuery();
  const utils = trpc.useUtils();
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const selectedProduct = useMemo(() => catalog?.find(product => product.id === selectedProductId) || null, [catalog, selectedProductId]);
  const recommendationId = useMemo(() => {
    const value = new URLSearchParams(location.split("?")[1] || "").get("recommendationId");
    const parsed = value ? Number(value) : undefined;
    return Number.isSafeInteger(parsed) && parsed! > 0 ? parsed : undefined;
  }, [location]);

  useEffect(() => {
    if (!selectedProductId && catalog?.[0]) setSelectedProductId(catalog[0].id);
  }, [catalog, selectedProductId]);

  const generate = trpc.aiActions.generateProductDescription.useMutation({
    onSuccess: () => {
      utils.aiActions.list.invalidate();
      toast.success("Draft created. Nothing has been published to Shopify.");
    },
    onError: error => toast.error(error.message),
  });
  const generatePositioning = trpc.aiActions.generatePositioning.useMutation({
    onSuccess: () => {
      utils.aiActions.list.invalidate();
      toast.success("Positioning draft created from your approved Business Brain.");
    },
    onError: error => toast.error(error.message),
  });
  const review = trpc.aiActions.review.useMutation({
    onSuccess: result => {
      utils.aiActions.list.invalidate();
      toast.success(result.status === "approved" ? "Draft approved and remembered by Cresna." : "Draft rejected. Cresna will retain that decision as context.");
    },
    onError: error => toast.error(error.message),
  });
  const requestWriteApproval = trpc.aiActions.requestWriteApproval.useMutation({
    onSuccess: () => { utils.aiActions.writeApprovals.invalidate(); toast.success("Your publishing request was recorded. Cresna has not sent anything to Shopify."); },
    onError: error => toast.error(error.message),
  });
  const aiIsWorking = generate.isPending || generatePositioning.isPending;

  if (isUnpaidPreview || isCheckingPreview) return <WorkspaceFrame eyebrow="AI Action Studio" title="Turn a signal into merchant-approved work." description="Choose a product, generate a draft that preserves your approved context, then decide whether Cresna should remember it as a direction. Nothing is sent to Shopify automatically."><UnpaidWorkspaceState title="Custom AI actions unlock with a trial" detail="This real AI Action Studio route is running without paid, trial, or beta access, so catalog facts, stored drafts, and generation controls are intentionally hidden." /></WorkspaceFrame>;
  if (catalogLoading) return <WorkspaceFrame eyebrow="AI Action Studio" title="Custom work, grounded in your store." description="Cresna uses your approved Business Brain and real catalog data to create reviewable drafts."><div className="grid min-h-[320px] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#7c9b1e]" /></div></WorkspaceFrame>;

  return <WorkspaceFrame eyebrow="AI Action Studio" title="Turn a signal into merchant-approved work." description="Choose a product, generate a draft that preserves your approved context, then decide whether Cresna should remember it as a direction. Nothing is sent to Shopify automatically.">
    {!catalog?.length ? <EmptyWorkspaceCard title="Connect and scan a Shopify catalog first" action="Connect store" onAction={() => window.location.assign("/app/connect")}>Cresna only creates custom drafts from products it can verify in your connected catalog.</EmptyWorkspaceCard> : <><div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[1.35rem] border border-border bg-card p-6 text-card-foreground shadow-[0_8px_30px_rgba(23,32,30,0.04)] sm:p-7">
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d9fa55] text-[#17201e]"><Sparkles className="h-4 w-4" /></span><div><p className="eyebrow text-[10px] text-muted-foreground">Custom action · Product content</p><h2 className="mt-1 text-xl font-extrabold tracking-[-0.05em]">Create a better product draft.</h2></div></div>
        <label className="mt-7 grid gap-2 text-xs font-bold text-foreground">Choose a connected product<select value={selectedProductId || ""} onChange={event => setSelectedProductId(Number(event.target.value))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring">{catalog.map(product => <option key={product.id} value={product.id}>{product.title}</option>)}</select></label>
        {selectedProduct ? <div className="mt-5 rounded-xl border border-border bg-muted p-4"><p className="text-sm font-bold">{selectedProduct.title}</p><div className="mt-3 grid grid-cols-3 gap-3 text-xs"><div><p className="text-muted-foreground">Description</p><p className="mt-1 font-bold">{textOnly(selectedProduct.descriptionHtml || "").length >= 80 ? "Present" : "Thin or missing"}</p></div><div><p className="text-muted-foreground">SEO</p><p className="mt-1 font-bold">{selectedProduct.seoTitle && selectedProduct.seoDescription ? "Present" : "Incomplete"}</p></div><div><p className="text-muted-foreground">Media</p><p className="mt-1 font-bold">{selectedProduct.mediaCount || 0} assets</p></div></div></div> : null}
        <div className="mt-5 rounded-xl border border-border p-4"><p className="text-xs font-bold">Business Brain context used</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{intelligence?.profile?.positioning || intelligence?.profile?.brandSummary || "Add your positioning and brand summary in Growth Profile to make every draft more specific."}</p></div>
        {recommendationId ? <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-[11px] font-semibold text-secondary-foreground">This draft will be linked to your approved Opportunity Engine item.</p> : null}
        {aiIsWorking ? <div className="mt-5 rounded-xl border border-primary/20 bg-primary/10 p-4 text-xs text-foreground"><div className="flex items-center gap-2 font-bold"><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />Building a reviewable draft</div><p className="mt-2 leading-5 text-muted-foreground">Cresna is checking the connected product record and approved Business Brain context, then will cite the source fields it used. It will not invent missing facts.</p></div> : null}
        <Button onClick={() => selectedProductId && generate.mutate({ productId: selectedProductId, recommendationId })} disabled={!selectedProductId || aiIsWorking} className="mt-6 h-11 w-full rounded-full bg-[#17201e] text-xs font-bold text-[#f8f7f2] hover:bg-[#293630]">{generate.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reading product facts & drafting…</> : <><Sparkles className="mr-2 h-4 w-4" />Generate product draft</>}</Button>
        <Button onClick={() => generatePositioning.mutate()} disabled={aiIsWorking} variant="outline" className="mt-3 h-10 w-full rounded-full border-border bg-transparent text-xs font-bold text-foreground hover:bg-secondary">{generatePositioning.isPending ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Reading Business Brain context…</> : <><Sparkles className="mr-2 h-3.5 w-3.5" />Generate positioning draft</>}</Button>
        <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">Cresna will not claim facts that are absent from your product record. You review every draft before a future publishing step.</p>
      </section>
      <section className="rounded-[1.35rem] border border-[#17201e]/12 bg-[#17201e] p-6 text-[#f8f7f2] sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="eyebrow text-[10px] text-[#aeb9b2]">Review queue</p><h2 className="mt-1 text-xl font-extrabold tracking-[-0.05em]">Your AI work stays yours.</h2></div><span className="rounded-full bg-[#d9fa55] px-3 py-1 text-[10px] font-extrabold text-[#17201e]">{drafts?.length || 0} drafts</span></div>{draftsLoading ? <div className="grid min-h-[250px] place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : !drafts?.length ? <div className="mt-6 grid min-h-[300px] place-items-center rounded-xl border border-dashed border-white/20 px-7 text-center"><div><FileText className="mx-auto h-6 w-6 text-[#d9fa55]" /><p className="mt-4 text-sm font-bold">No custom drafts yet.</p><p className="mt-2 text-xs leading-5 text-[#c7d0cb]">Create a product or positioning draft from evidence Cresna can verify. It will appear here for review.</p></div></div> : <div className="mt-6 space-y-4">{drafts.slice(0, 4).map(({ draft, product, parsedDraft }) => <article key={draft.id} className="rounded-xl border border-white/15 bg-white/[0.05] p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold">{draft.actionType === "positioning" ? "Brand positioning" : product?.title || "Catalog item"}</p><p className="mt-1 text-[11px] text-[#c7d0cb]">{draft.status === "generated" ? "Awaiting your decision" : draft.status === "approved" ? "Approved — remembered by Cresna" : "Rejected — decision recorded"}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${draft.status === "approved" ? "bg-[#d9fa55] text-[#17201e]" : draft.status === "rejected" ? "bg-white/15 text-[#f8f7f2]" : "bg-white/10 text-[#f8f7f2]"}`}>{draft.status}</span></div><div className="mt-4 max-h-36 overflow-auto rounded-lg bg-black/15 p-3 font-mono text-[11px] leading-5 text-[#e9eee9]">{parsedDraft?.descriptionHtml || parsedDraft?.positioning || draft.generatedContent}</div>{(parsedDraft?.notes || parsedDraft?.missingEvidence)?.length ? <p className="mt-3 text-[11px] leading-5 text-[#c7d0cb]">Needs your input: {(parsedDraft.notes || parsedDraft.missingEvidence)?.join(" ")}</p> : null}{draft.status === "generated" ? <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => review.mutate({ draftId: draft.id, status: "approved" })} disabled={review.isPending} className="h-8 rounded-full bg-[#d9fa55] px-3 text-[11px] font-bold text-[#17201e] hover:bg-[#e7ff89]"><Check className="mr-1 h-3.5 w-3.5" />Approve direction</Button><Button size="sm" variant="outline" onClick={() => review.mutate({ draftId: draft.id, status: "rejected" })} disabled={review.isPending} className="h-8 rounded-full border-white/25 bg-transparent px-3 text-[11px] text-[#f8f7f2] hover:bg-white/10 hover:text-[#f8f7f2]"><X className="mr-1 h-3.5 w-3.5" />Reject</Button><Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(parsedDraft?.descriptionHtml || parsedDraft?.positioning || draft.generatedContent).then(() => toast.success("Draft copied"))} className="h-8 rounded-full px-3 text-[11px] text-[#f8f7f2] hover:bg-white/10 hover:text-[#f8f7f2]"><Copy className="mr-1 h-3.5 w-3.5" />Copy</Button></div> : null}</article>)}</div>}</section>
    </div><MerchantWriteApprovalPanel drafts={drafts ?? []} approvals={writeApprovals ?? []} pending={requestWriteApproval.isPending} onRequest={draftId => requestWriteApproval.mutate({ draftId })} /></>}
  </WorkspaceFrame>;
}

function MerchantWriteApprovalPanel({ drafts, approvals, pending, onRequest }: { drafts: Array<{ draft: { id: number; status: string; actionType: string }; product: { title: string } | null }>; approvals: Array<{ draftId: number; status: string; operation: string; createdAt: Date; approvalNote: string | null }>; pending: boolean; onRequest: (draftId: number) => void }) {
  const approvedDrafts = drafts.filter(item => item.draft.status === "approved");
  const approvalByDraft = new Map(approvals.map(approval => [approval.draftId, approval]));
  return <section className="mt-5 rounded-[1.35rem] border border-border bg-card p-6 text-card-foreground sm:p-7"><p className="eyebrow text-[10px] text-muted-foreground">Merchant write permission</p><h2 className="mt-2 text-xl font-extrabold tracking-[-0.05em]">Record consent before any future publishing step.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Cresna currently has read-only Shopify scopes and no configured publishing API. A recorded request is an auditable merchant approval only—it does not send a product, page, price, or storefront change to Shopify.</p>{approvedDrafts.length ? <div className="mt-6 divide-y divide-border border-y border-border">{approvedDrafts.map(({ draft, product }) => { const approval = approvalByDraft.get(draft.id); return <div key={draft.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold">{draft.actionType === "positioning" ? "Brand positioning draft" : product?.title || "Product content draft"}</p>{approval ? <div className="mt-1 text-xs leading-5 text-muted-foreground"><p>Audit record: <strong className="text-foreground">{approval.operation.replaceAll("_", " ")}</strong> · <strong className="text-foreground">{approval.status.replaceAll("_", " ")}</strong> · {new Date(approval.createdAt).toLocaleString()}</p><p>Approval note: {approval.approvalNote || "No note provided"}</p></div> : <p className="mt-1 text-xs text-muted-foreground">No publishing approval recorded</p>}</div><Button variant="outline" onClick={() => onRequest(draft.id)} disabled={pending} className="rounded-full text-xs font-bold">{approval ? "Refresh recorded approval" : "Record publishing approval"}</Button></div>; })}</div> : <p className="mt-5 rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">Approve a draft direction first. Cresna never interprets a generated draft as permission to change your Shopify store.</p>}</section>;
}
