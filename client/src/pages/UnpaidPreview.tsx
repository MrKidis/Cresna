import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, LockKeyhole, Store } from "lucide-react";
import { useLocation } from "wouter";

const lockedCapabilities = [
  ["Evidence-backed Opportunity Engine", "Available with a paid Cresna plan after the limited free workspace."],
  ["Custom AI Action Studio", "Creates merchant-reviewed drafts only after paid access starts."],
  ["Impact measurement", "Measures confirmed actions against real connected-store data."],
];

export default function UnpaidPreview() {
  const [, setLocation] = useLocation();
  const { data: previewAccess, isLoading, error } = trpc.preview.unpaidWorkspace.useQuery();
  const verifiedNoAccess = previewAccess?.hasAccess === false && previewAccess?.accessSource === "none" && previewAccess.previewMode === "unpaid";

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-[#f5f5f1] px-5 py-8 text-[#17201e] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-[10px] text-[#65706b]">Unpaid workspace preview</p>
          <h1 className="mt-3 max-w-3xl text-[clamp(2.25rem,5vw,4.4rem)] font-extrabold leading-[.96] tracking-[-.07em]">This is the real no-plan gate.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-[#65706b]">The current product shell is running against a server-authored no-subscription contract. It intentionally contains no merchant, store, revenue, recommendation, or outcome data.</p>
          <div className="mt-8 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <section className="rounded-[1.4rem] border border-[#17201e]/12 bg-[#fdfdfb] p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow text-[10px] text-[#65706b]">Access status</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.05em] text-[#17201e]">{isLoading ? "Checking no-plan access…" : verifiedNoAccess ? "No active trial or subscription" : "Preview access unavailable"}</h2>
            </div>
            <span className="rounded-full border border-[#b97057]/30 bg-[#fff1eb] px-3 py-1.5 text-[10px] font-bold text-[#9a4c37]">Unpaid preview</span>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#53605a]">{verifiedNoAccess ? "The server confirms this preview has no paid or beta access. AI recommendations, drafts, and outcome measurement remain unavailable until the seller chooses an available paid Cresna plan." : error ? "Cresna could not verify the preview gate right now. No merchant data is displayed in this view." : "Cresna is confirming the no-plan gate. No merchant data is displayed in this view."}</p>
          <div className="mt-7 rounded-2xl border border-dashed border-[#17201e]/18 bg-[#f5f5f1] p-5">
            <div className="flex gap-3"><Store className="mt-0.5 h-5 w-5 shrink-0 text-[#7c9b1e]" /><div><p className="text-sm font-bold text-[#17201e]">No Shopify store connected</p><p className="mt-1 text-xs leading-5 text-[#65706b]">Growth Score, scan findings, and opportunity evidence intentionally stay empty until a seller chooses to connect their own store and completes a real sync.</p></div></div>
          </div>
          <Button type="button" onClick={() => setLocation("/app/billing")} className="mt-7 h-11 rounded-full px-5 text-xs font-bold">View plan choices <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </section>

        <section className="rounded-[1.4rem] border border-[#17201e]/12 bg-[#eceee8] p-6 sm:p-7">
          <p className="eyebrow text-[10px] text-[#65706b]">Feature gates</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.05em] text-[#17201e]">What remains locked until access begins.</h2>
          <div className="mt-6 space-y-3">
            {lockedCapabilities.map(([title, detail]) => <article key={title} className="rounded-xl border border-[#17201e]/10 bg-[#fdfdfb]/80 p-4"><div className="flex gap-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#65706b]" /><div><p className="text-sm font-bold text-[#17201e]">{title}</p><p className="mt-1 text-xs leading-5 text-[#65706b]">{detail}</p></div></div></article>)}
          </div>
          <div className="mt-6 flex gap-3 rounded-xl border border-[#7c9b1e]/20 bg-[#ecf3d6] p-4 text-xs leading-5 text-[#44512c]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#61791a]" />Cresna never manufactures a result for an unpaid workspace. Once access starts, every finding is tied to connected-store evidence and every AI draft still requires merchant review.</div>
        </section>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
