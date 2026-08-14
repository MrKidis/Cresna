import { AIChatBox, type Message } from "@/components/AIChatBox";
import { EmptyWorkspaceCard, WorkspaceFrame } from "@/components/WorkspaceFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Bot, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const betaFeatures = [
  ["ai_recommendations", "AI recommendations"],
  ["ai_actions", "AI Action Studio"],
  ["outcome_measurement", "Outcome measurement"],
  ["beta_feedback", "Beta feedback"],
] as const;

const suggestedQuestions = [
  "What is the strongest activation bottleneck in the current platform snapshot?",
  "Where should I focus product work this week?",
  "How should I interpret our measured outcomes so far?",
];

export default function OwnerPanel() {
  const { data, isLoading, error } = trpc.founder.overview.useQuery();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const accessRequests = trpc.founder.accessRequests.useQuery(undefined, { enabled: Boolean(data) });

  const invite = trpc.founder.inviteBeta.useMutation({
    onSuccess: result => {
      setEmail("");
      utils.founder.overview.invalidate();
      if (result.deliveryStatus === "sent") toast.success("Beta invitation sent from Gmail");
      else if (result.deliveryStatus === "unconfigured") toast.message("Invitation created; Gmail sender still needs setup");
      else toast.error("Invitation was created, but Gmail could not send it");
    },
    onError: mutationError => toast.error(mutationError.message),
  });
  const updateFeature = trpc.founder.setBetaFeature.useMutation({
    onSuccess: () => utils.founder.overview.invalidate(),
    onError: mutationError => toast.error(mutationError.message),
  });
  const assistant = trpc.founder.askAssistant.useMutation({
    onSuccess: ({ answer }) => setMessages(previous => [...previous, { role: "assistant", content: answer }]),
    onError: mutationError => toast.error(mutationError.message),
  });
  const inviteAccessRequest = trpc.founder.inviteAccessRequest.useMutation({
    onSuccess: result => {
      utils.founder.accessRequests.invalidate();
      utils.founder.overview.invalidate();
      if (result.deliveryStatus === "sent") toast.success("Beta invitation sent from Gmail");
      else if (result.deliveryStatus === "unconfigured") toast.message("Invitation created; Gmail sender still needs setup");
      else toast.error("Invitation was created, but Gmail could not send it");
    },
    onError: mutationError => toast.error(mutationError.message),
  });

  const sendOwnerQuestion = (message: string) => {
    if (assistant.isPending) return;
    setMessages(previous => [...previous, { role: "user", content: message }]);
    assistant.mutate({ message });
  };

  if (isLoading) {
    return <WorkspaceFrame eyebrow="Owner Panel" title="Loading owner intelligence." description="Private controls and aggregated platform signals for the configured Cresna owner identity."><div className="grid min-h-[300px] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#7c9b1e]" /></div></WorkspaceFrame>;
  }

  if (error) {
    return <WorkspaceFrame eyebrow="Owner Panel" title="Owner access only." description="This workspace is reserved for the configured Cresna owner identity."><EmptyWorkspaceCard title="Owner Panel is private">Only the permanent owner account can view platform aggregates, run the owner assistant, invite beta testers, or alter controlled feature access.</EmptyWorkspaceCard></WorkspaceFrame>;
  }

  const invites = data?.betaInvites || [];
  const activeBetaCount = invites.filter(inviteRow => inviteRow.status === "active").length;
  const metricCards = [
    ["Total users", data?.totalUsers || 0],
    ["Connected stores", data?.connectedStores || 0],
    ["Stripe-linked workspaces", data?.stripeLinkedWorkspaces || 0],
    ["Paid subscriptions", data?.billingSummary.activeSubscriptions || 0],
    ["Trialing workspaces", data?.billingSummary.trialingWorkspaces || 0],
    ["Active beta", activeBetaCount],
    ["Beta feedback", data?.betaFeedbackSummary.totalSubmissions || 0],
    ["Recommendations generated", data?.recommendationsGenerated || 0],
    ["AI drafts approved", data?.aiDraftsApproved || 0],
    ["Outcomes measured", data?.outcomesMeasured || 0],
    ["Positive outcomes", data?.positiveOutcomes || 0],
  ];

  return (
    <WorkspaceFrame
      eyebrow="Owner Panel"
      title="Operate Cresna with evidence, not access to merchant records."
      description="Only the configured owner identity can open this space. Every platform metric and AI response is aggregate-only; it does not surface individual merchant, customer, catalog, or payment information."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(([label, value]) => <section key={String(label)} className="rounded-[1.2rem] border border-border bg-card p-5 text-card-foreground"><p className="eyebrow text-[10px] text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-extrabold tracking-[-0.06em]">{value}</p></section>)}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#65706b]">{data?.billingSummary.isConfigured ? data.billingSummary.syncError || `Stripe aggregates: ${data.billingSummary.proSubscriptions} Pro, ${data.billingSummary.growthSubscriptions} Growth, and ${data.billingSummary.unmappedSubscriptions} subscription${data.billingSummary.unmappedSubscriptions === 1 ? "" : "s"} awaiting a plan mapping.` : "Stripe has not been configured yet, so paid and trial aggregates will remain at zero."}</p>

      <section className="mt-5 overflow-hidden rounded-[1.45rem] border border-[#17201e] bg-[#17201e] p-6 text-[#f8f7f2] sm:p-7">
        <div className="grid gap-5 xl:grid-cols-[.74fr_1.26fr] xl:items-center">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d9fa55] text-[#17201e]"><Bot className="h-5 w-5" /></div>
            <p className="eyebrow mt-6 text-[10px] text-[#d9fa55]">Owner Intelligence</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.05em]">Ask about platform health.</h2>
            <p className="mt-3 text-sm leading-6 text-[#d9e1dc]">This assistant receives the stored aggregate snapshot shown above. It cannot browse individual seller data or retrieve customer, order, product, or payment details.</p>
          </div>
          <AIChatBox
            messages={messages}
            onSendMessage={sendOwnerQuestion}
            isLoading={assistant.isPending}
            loadingLabel="Reviewing the verified aggregate platform snapshot…"
            height="370px"
            className="border-white/10 bg-card text-card-foreground"
            placeholder="Ask about activation, adoption, or outcome signals…"
            emptyStateMessage="Ask a question about the aggregate Cresna platform snapshot."
            suggestedPrompts={suggestedQuestions}
          />
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
        <section className="rounded-[1.35rem] border border-[#17201e] bg-[#17201e] p-6 text-[#f8f7f2]">
          <ShieldCheck className="h-5 w-5 text-[#d9fa55]" />
          <p className="eyebrow mt-7 text-[10px] text-[#b6c1bb]">Founding Beta</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.05em]">Invite a test partner.</h2>
          <p className="mt-3 text-sm leading-6 text-[#d9e1dc]">Each accepted invitation activates one-time, two-day beta access after that exact email signs in. Cresna never generates testimonials or reviews from beta feedback. Invitations send from the owner’s configured Gmail address and are not treated as delivered until Gmail reports success.</p>
          <form className="mt-6 space-y-3" onSubmit={event => { event.preventDefault(); invite.mutate({ email }); }}>
            <label className="sr-only" htmlFor="owner-beta-email">Beta tester email</label>
            <Input id="owner-beta-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="tester@brand.com" className="h-11 border-white/15 bg-white/10 text-white placeholder:text-[#b6c1bb] focus-visible:ring-accent" />
            <Button type="submit" disabled={invite.isPending} className="h-11 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">{invite.isPending ? "Creating invitation…" : "Create 2-day beta invitation"}</Button>
          </form>
          <div className="mt-7 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between gap-3"><div><p className="eyebrow text-[10px] text-[#b6c1bb]">Access requests</p><p className="mt-1 text-xs leading-5 text-[#d9e1dc]">Requests never grant access until you choose to invite the exact email.</p></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-[#f8f7f2]">{accessRequests.data?.filter(request => request.status === "requested").length || 0} waiting</span></div>
            {accessRequests.isLoading ? <p className="mt-4 text-xs text-[#b6c1bb]">Loading requests…</p> : !accessRequests.data?.length ? <p className="mt-4 text-xs leading-5 text-[#b6c1bb]">No beta access requests yet.</p> : <div className="mt-4 space-y-3">{accessRequests.data.slice(0, 4).map(request => <article key={request.id} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{request.email}</p>{request.storeUrl ? <p className="mt-1 truncate text-[11px] text-[#b6c1bb]">{request.storeUrl}</p> : null}</div><span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold text-[#d9e1dc]">{request.status}</span></div>{request.note ? <p className="mt-2 text-[11px] leading-5 text-[#d9e1dc]">{request.note}</p> : null}{request.status === "requested" ? <Button type="button" size="sm" disabled={inviteAccessRequest.isPending} onClick={() => inviteAccessRequest.mutate({ requestId: request.id })} className="mt-3 h-8 rounded-full bg-accent px-3 text-[10px] font-bold text-accent-foreground hover:bg-accent/90">{inviteAccessRequest.isPending ? "Sending…" : "Approve & email invite"}</Button> : <p className="mt-3 text-[10px] text-[#b6c1bb]">Invitation action recorded. The exact email must sign in to activate its one-time two-day beta period.</p>}</article>)}</div>}
          </div>
        </section>

        <section className="rounded-[1.35rem] border border-[#17201e]/12 bg-[#fdfdfb] p-6">
          <p className="eyebrow text-[10px] text-[#65706b]">Access controls</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.05em] text-[#17201e]">Feature flags stay deliberate.</h2>
          {!invites.length ? <p className="mt-7 text-sm leading-6 text-[#65706b]">No beta invitations have been created. Add a test partner when you are ready to collect structured feedback.</p> : <div className="mt-6 space-y-4">{invites.map(inviteRow => <article key={inviteRow.id} className="rounded-xl border border-[#17201e]/10 bg-[#f5f5f1] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-[#17201e]">{inviteRow.email}</p><div className="flex items-center gap-2"><span className="rounded-full bg-[#e9ebe5] px-2.5 py-1 text-[10px] font-bold text-[#53605a]">{inviteRow.status}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${inviteRow.deliveryStatus === "sent" ? "bg-[#e7f4cd] text-[#526b1a]" : inviteRow.deliveryStatus === "failed" ? "bg-[#f9e4df] text-[#9c3d2f]" : "bg-[#eceee8] text-[#65706b]"}`}>{inviteRow.deliveryStatus === "sent" ? "Email sent" : inviteRow.deliveryStatus === "failed" ? "Send failed" : inviteRow.deliveryStatus === "unconfigured" ? "Gmail setup needed" : "Awaiting send"}</span></div></div>{inviteRow.deliveryError ? <p className="mt-3 text-xs leading-5 text-[#9c3d2f]">{inviteRow.deliveryError}</p> : null}{inviteRow.status === "active" ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{betaFeatures.map(([key, label]) => { const override = inviteRow.featureOverrides.find(item => item.featureKey === key); return <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-[#17201e]/10 bg-[#fdfdfb] px-3 py-2 text-xs font-semibold text-[#17201e]"><span>{label}</span><input aria-label={`${label} for ${inviteRow.email}`} type="checkbox" checked={override ? override.enabled === 1 : true} onChange={event => updateFeature.mutate({ betaInviteId: inviteRow.id, featureKey: key, enabled: event.target.checked })} className="h-4 w-4 accent-[#17201e]" /></label>; })}</div> : <p className="mt-3 text-xs leading-5 text-[#65706b]">Feature controls appear after the tester accepts by signing in with the invited email.</p>}</article>)}</div>}
          <div className="mt-5 rounded-xl border border-[#17201e]/10 bg-[#f5f5f1] p-4"><p className="eyebrow text-[10px] text-[#65706b]">Feedback pulse</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-xl font-extrabold tracking-[-0.04em] text-[#17201e]">{data?.betaFeedbackSummary.totalSubmissions || 0}</p><p className="text-[11px] text-[#65706b]">structured submissions</p></div><div><p className="text-xl font-extrabold tracking-[-0.04em] text-[#17201e]">{data?.betaFeedbackSummary.averageGrowthProfileRating ?? "—"}</p><p className="text-[11px] text-[#65706b]">average Growth Profile rating</p></div><div><p className="text-xl font-extrabold tracking-[-0.04em] text-[#17201e]">{data?.betaFeedbackSummary.writtenResponseCount || 0}</p><p className="text-[11px] text-[#65706b]">written responses</p></div></div><p className="mt-3 text-[11px] leading-5 text-[#65706b]">This panel summarizes participation and structured fields only. Individual written feedback remains in the beta workspace and is not repurposed as public proof.</p></div>
        </section>
      </div>
    </WorkspaceFrame>
  );
}
