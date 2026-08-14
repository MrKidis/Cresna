import { UnpaidWorkspaceState, WorkspaceFrame } from "@/components/WorkspaceFrame";
import { useUnpaidPreview } from "@/contexts/UnpaidPreviewContext";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const plans = [
  ["pro", "Pro", "$19", "$190", "For independent owners who need a disciplined growth loop grounded in their connected store.", ["Business Brain, goals, and transparent Growth Score", "Evidence-backed opportunity ranking with clear confidence and effort", "500 reviewable AI actions per month—nothing publishes without approval"]],
  ["growth", "Growth", "$49", "$490", "For growing brands that need more room to turn verified store signals into measured, reviewed improvements.", ["Everything in Pro", "2,500 reviewable AI actions per month", "Five times the monthly AI-action capacity plus deeper catalog intelligence"]],
] as const;

export default function Billing() {
  const { isUnpaidPreview, isCheckingPreview } = useUnpaidPreview();
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [, setLocation] = useLocation();
  const { data: billing } = trpc.billing.status.useQuery();
  const { data: beta } = trpc.foundingBeta.me.useQuery();
  const checkout = trpc.billing.checkout.useMutation({ onSuccess: ({ checkoutUrl }) => { toast.success("Opening secure Stripe Checkout in a new tab"); window.open(checkoutUrl, "_blank", "noopener,noreferrer"); }, onError: error => toast.error(error.message) });
  const portal = trpc.billing.portal.useMutation({ onSuccess: ({ portalUrl }) => window.open(portalUrl, "_blank", "noopener,noreferrer"), onError: error => toast.error(error.message) });
  const accessLabel = billing?.accessSource === "owner" ? "Owner access · Growth features included" : billing?.accessSource === "beta" ? "Founding Beta · temporary access" : billing?.accessSource === "stripe" ? `Subscription · ${billing.plan || "Cresna"}` : billing?.accessSource === "free" ? "Cresna Free · limited workspace" : "No active access state";
  const periodLabel = billing?.currentPeriodEnd ? `${billing.accessSource === "beta" ? "Beta access ends" : billing.status === "trialing" ? "Trial ends" : "Renews"} ${new Date(billing.currentPeriodEnd).toLocaleDateString()}` : null;
  const hasPaidOrPrivilegedAccess = billing?.accessSource === "owner" || billing?.accessSource === "beta" || billing?.accessSource === "stripe";
  const requiresFinalBetaFeedback = beta?.invite?.status === "expired" && !beta.feedback.some(item => item.checkpoint === "day_7");

  return <WorkspaceFrame eyebrow="Plans & billing" title="Choose the Cresna capacity that fits your operating rhythm." description="Every signed-in workspace can use Cresna Free with a small monthly AI-action allowance. Paid checkout currently uses the configured Stripe integration. RevenueCat is not connected yet, so its entitlement and paywall handoff is not presented as live.">
    {isUnpaidPreview || isCheckingPreview ? <UnpaidWorkspaceState title="Billing is not available in the unpaid preview" detail="This verified preview intentionally has no account, subscription, or purchase record." /> : <>
      <div className="mb-7 flex flex-col items-start gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between"><div className="rounded-full border border-border bg-card p-1"><Button type="button" size="sm" variant={interval === "month" ? "default" : "ghost"} onClick={() => setInterval("month")} className="rounded-full text-[11px]">Monthly</Button><Button type="button" size="sm" variant={interval === "year" ? "default" : "ghost"} onClick={() => setInterval("year")} className="rounded-full text-[11px]">Annual · 2 months free</Button></div><div className="text-left sm:text-right"><p className="text-[11px] font-bold text-foreground">{accessLabel}</p>{periodLabel ? <p className="mt-1 text-[11px] text-muted-foreground">{periodLabel}</p> : null}{billing?.accessSource === "stripe" ? <Button type="button" variant="link" onClick={() => portal.mutate()} disabled={portal.isPending} className="mt-2 h-auto px-0 text-[11px] font-bold">Manage subscription</Button> : null}</div></div>
      {requiresFinalBetaFeedback ? <section className="mb-5 rounded-2xl border border-primary/30 bg-primary/10 p-5 text-card-foreground"><p className="text-sm font-bold">Your beta window is complete.</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Submit the final private feedback check-in before continuing to a paid plan. Cresna enforces this again on the server when Checkout is requested.</p><Button onClick={() => setLocation("/app/beta")} className="mt-4 rounded-full text-xs font-bold">Complete final feedback</Button></section> : null}
      <div className="grid gap-5 lg:grid-cols-2">{plans.map(([key, name, monthly, annual, note, features], index) => <article key={name} className={`rounded-[1.35rem] border p-7 ${index ? "border-[#17201e] bg-[#17201e] text-[#f8f7f2]" : "border-border bg-card text-card-foreground"}`}><p className={`eyebrow text-[10px] ${index ? "text-[#d9fa55]" : "text-muted-foreground"}`}>{name}</p><p className="mt-5 text-5xl font-extrabold tracking-[-0.07em]">{interval === "month" ? monthly : annual}</p><p className={`mt-2 text-xs ${index ? "text-[#b6c1bb]" : "text-muted-foreground"}`}>{interval === "month" ? "per month" : "per year"}</p><p className={`mt-7 text-sm leading-6 ${index ? "text-[#d9e1dc]" : "text-muted-foreground"}`}>{note}</p><ul className="mt-6 space-y-3">{features.map(feature => <li key={feature} className={`flex gap-2 text-xs leading-5 ${index ? "text-[#d9e1dc]" : "text-muted-foreground"}`}><Check className={`mt-0.5 h-4 w-4 shrink-0 ${index ? "text-[#d9fa55]" : "text-primary"}`} />{feature}</li>)}</ul><div className={`mt-7 flex items-center gap-2 text-xs font-bold ${index ? "text-[#f8f7f2]" : "text-foreground"}`}><Check className={`h-4 w-4 ${index ? "text-[#d9fa55]" : "text-primary"}`} />Paid access starts immediately after checkout</div><Button type="button" onClick={() => requiresFinalBetaFeedback ? setLocation("/app/beta") : checkout.mutate({ plan: key, interval })} disabled={checkout.isPending || hasPaidOrPrivilegedAccess} className={`mt-9 h-11 w-full rounded-full text-xs font-bold ${index ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}>{hasPaidOrPrivilegedAccess ? "Current access is active" : requiresFinalBetaFeedback ? "Complete beta feedback first" : checkout.isPending ? "Opening Checkout…" : `Choose ${name}`}</Button></article>)}</div>
    </>}
  </WorkspaceFrame>;
}
