import { EmptyWorkspaceCard, WorkspaceFrame } from "@/components/WorkspaceFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const goalOptions = [
  ["more_sales", "More sales"],
  ["more_customers", "More customers"],
  ["brand_awareness", "Brand awareness"],
  ["better_seo", "Better SEO"],
  ["competitor_edge", "Stand out from competitors"],
  ["improve_store", "Improve my store"],
  ["not_sure", "I’m not sure yet"],
] as const;

type Goal = (typeof goalOptions)[number][0];

function readGoals(value?: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((goal): goal is Goal => goalOptions.some(([key]) => key === goal)) : [];
  } catch {
    return [];
  }
}

export default function GrowthProfile() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading } = trpc.growthProfile.me.useQuery();
  const { data: overview } = trpc.analytics.overview.useQuery();
  const { data: opportunities } = trpc.recommendations.list.useQuery();
  const utils = trpc.useUtils();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [brandSummary, setBrandSummary] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [brandVoice, setBrandVoice] = useState("");

  useEffect(() => {
    if (!profile) return;
    setGoals(readGoals(profile.goalsJson));
    setBrandSummary(profile.brandSummary || "");
    setTargetCustomer(profile.targetCustomer || "");
    setBrandVoice(profile.brandVoice || "");
  }, [profile]);

  const save = trpc.growthProfile.update.useMutation({
    onSuccess: () => {
      utils.growthProfile.me.invalidate();
      toast.success("Growth Profile saved");
    },
    onError: error => toast.error(error.message),
  });

  const toggleGoal = (goal: Goal) => setGoals(current => current.includes(goal) ? current.filter(item => item !== goal) : [...current, goal]);
  const scanStatus = profile?.scanStatus || "not_started";
  const statusCopy = scanStatus === "ready" ? "Your connected store has enough synchronized reporting days for Cresna to start identifying evidence-backed opportunities." : scanStatus === "needs_more_data" ? "Your store is connected, but Cresna needs at least seven reported days before it can responsibly make growth recommendations." : "Connect a Shopify store to give Cresna a real data baseline. No score will be invented before then.";

  return <WorkspaceFrame eyebrow="Growth Profile" title="Teach Cresna how your business should grow." description="Your Growth Profile remembers the goals and brand context you choose to share. It gives every future opportunity a clearer business purpose.">
    {isLoading ? <div className="grid min-h-[300px] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#7c9b1e]" /></div> : <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[1.35rem] border border-[#17201e]/12 bg-[#fdfdfb] p-6 shadow-[0_8px_30px_rgba(23,32,30,0.04)] sm:p-8">
        <div><p className="eyebrow text-[10px] text-[#65706b]">Step 2 of 3 · Your goals</p><h2 className="mt-3 text-2xl font-extrabold tracking-[-0.05em]">What are you trying to change?</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#53605a]">Choose the outcomes that matter now. Cresna uses these as context; it does not invent a brand strategy on your behalf.</p></div>
        <fieldset className="mt-7 grid gap-3 sm:grid-cols-2"><legend className="sr-only">Growth priorities</legend>{goalOptions.map(([key, label]) => <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-semibold transition-colors ${goals.includes(key) ? "border-[#17201e] bg-[#17201e] text-[#f8f7f2]" : "border-[#17201e]/12 text-[#17201e] hover:bg-[#f5f5f1]"}`}><input className="sr-only" type="checkbox" checked={goals.includes(key)} onChange={() => toggleGoal(key)} /><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${goals.includes(key) ? "border-[#d9fa55] bg-[#d9fa55] text-[#17201e]" : "border-[#17201e]/25"}`}>{goals.includes(key) ? <Check className="h-3.5 w-3.5" /> : null}</span>{label}</label>)}</fieldset>
        <div className="mt-8 grid gap-5"><label className="grid gap-2 text-xs font-bold text-[#17201e]">What does your brand sell?<Textarea value={brandSummary} onChange={event => setBrandSummary(event.target.value)} placeholder="For example: Everyday essentials designed for thoughtful home cooks." className="min-h-24 border-[#17201e]/15 bg-[#f5f5f1] text-sm" /></label><label className="grid gap-2 text-xs font-bold text-[#17201e]">Who is it for?<Textarea value={targetCustomer} onChange={event => setTargetCustomer(event.target.value)} placeholder="For example: First-time apartment dwellers who care about quality and useful design." className="min-h-24 border-[#17201e]/15 bg-[#f5f5f1] text-sm" /></label><label className="grid gap-2 text-xs font-bold text-[#17201e]">Brand voice<Input value={brandVoice} onChange={event => setBrandVoice(event.target.value)} placeholder="For example: warm, direct, quietly confident" className="border-[#17201e]/15 bg-[#f5f5f1]" /></label></div>
        <Button onClick={() => save.mutate({ goals, brandSummary, targetCustomer, brandVoice })} disabled={save.isPending || !goals.length} className="mt-8 h-11 rounded-full bg-[#17201e] px-6 text-xs font-bold text-[#f8f7f2] hover:bg-[#293630] disabled:opacity-60">{save.isPending ? "Saving…" : "Save Growth Profile"}<ChevronRight className="ml-1 h-4 w-4" /></Button>
      </section>
      <aside className="space-y-5"><section className="rounded-[1.35rem] border border-[#17201e] bg-[#17201e] p-7 text-[#f8f7f2]"><p className="eyebrow text-[10px] text-[#b6c1bb]">Step 3 of 3 · Store scan</p><h2 className="mt-4 text-2xl font-extrabold tracking-[-0.05em]">What Cresna can currently see.</h2><p className="mt-4 text-sm leading-6 text-[#d9e1dc]">{statusCopy}</p><div className="mt-7 border-t border-white/15 pt-5 text-xs leading-6 text-[#d9e1dc]"><p><span className="font-bold text-[#d9fa55]">Connected store:</span> {overview?.store?.displayName || "Not connected"}</p><p><span className="font-bold text-[#d9fa55]">Synchronized days:</span> {overview?.dailyMetrics?.length || 0}</p><p><span className="font-bold text-[#d9fa55]">Product records:</span> {overview?.productMetrics?.length || 0}</p></div>{!overview?.store ? <Button onClick={() => setLocation("/app/connect")} className="mt-7 h-10 rounded-full bg-[#d9fa55] text-xs font-bold text-[#17201e] hover:bg-[#e4ff83]">Connect Shopify</Button> : null}</section><section className="rounded-[1.35rem] border border-[#17201e]/12 bg-[#fdfdfb] p-6"><p className="eyebrow text-[10px] text-[#65706b]">What Cresna found</p>{opportunities?.length ? <div className="mt-5 space-y-4">{opportunities.slice(0, 2).map(opportunity => <div key={opportunity.id} className="rounded-xl border border-[#17201e]/10 bg-[#f5f5f1] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold leading-5">{opportunity.title}</p><span className="shrink-0 text-[10px] font-bold text-[#7c9b1e]">{opportunity.effortLevel} effort</span></div><p className="mt-2 text-xs leading-5 text-[#65706b]">{opportunity.evidence}</p></div>)}<button type="button" onClick={() => setLocation("/app/actions")} className="inline-flex items-center gap-1 text-xs font-bold text-[#17201e]">Review all opportunities <ChevronRight className="h-3.5 w-3.5" /></button></div> : <p className="mt-4 text-sm leading-6 text-[#65706b]">No verified opportunities yet. Cresna will show only findings supported by your store data after a scan has enough reporting history.</p>}</section><section className="rounded-[1.35rem] border border-[#17201e]/12 bg-[#fdfdfb] p-6"><p className="eyebrow text-[10px] text-[#65706b]">The Cresna loop</p><div className="mt-5 space-y-4">{[["01", "Scan", "Use approved store data."], ["02", "Spot", "Rank evidence-backed opportunities."], ["03", "Approve", "You stay in control of every change."], ["04", "Measure", "Compare an agreed before-and-after window."]].map(([number, title, copy]) => <div key={number} className="flex gap-3"><span className="font-mono text-xs text-[#7c9b1e]">{number}</span><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-[#65706b]">{copy}</p></div></div>)}</div></section></aside>
    </div>}
  </WorkspaceFrame>;
}
