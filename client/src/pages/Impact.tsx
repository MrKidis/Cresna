import { EmptyWorkspaceCard, WorkspaceFrame } from "@/components/WorkspaceFrame";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Impact() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.impact.list.useQuery();
  return <WorkspaceFrame eyebrow="Revenue impact" title="Know what changed after you act." description="When you mark a recommendation complete, Cresna fixes a transparent before-and-after measurement window. If the data is insufficient, it says so rather than claiming an outcome.">{isLoading ? <div className="grid min-h-[300px] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#7c9b1e]" /></div> : !data?.length ? <EmptyWorkspaceCard title="Your impact log starts with a completed action" action="View action feed" onAction={() => setLocation("/app/actions")}>Completed actions will appear here with their baseline period, comparison period, and observed revenue change.</EmptyWorkspaceCard> : <div className="space-y-4">{data.map(({ action, recommendation }) => <article key={action.id} className="rounded-[1.35rem] border border-[#17201e]/12 bg-[#fdfdfb] p-6"><p className="eyebrow text-[10px] text-[#65706b]">{action.measurementStatus.replace("_", " ")}</p><h2 className="mt-3 text-xl font-extrabold tracking-[-0.045em]">{recommendation.title}</h2><div className="mt-6 grid gap-5 border-t border-[#17201e]/10 pt-5 sm:grid-cols-3"><Metric label="Baseline revenue" value={Number(action.baselineRevenue).toLocaleString()} /><Metric label="Comparison revenue" value={action.comparisonRevenue ? Number(action.comparisonRevenue).toLocaleString() : "Waiting for data"} /><Metric label="Observed change" value={action.revenueChange ? Number(action.revenueChange).toLocaleString() : "Not measured"} /></div></article>)}</div>}</WorkspaceFrame>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="eyebrow text-[9px] text-[#65706b]">{label}</p><p className="mt-2 text-sm font-bold text-[#17201e]">{value}</p></div>; }
