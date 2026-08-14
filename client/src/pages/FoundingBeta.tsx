import { EmptyWorkspaceCard, WorkspaceFrame } from "@/components/WorkspaceFrame";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Clock3, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function FoundingBeta() {
  const { data, isLoading } = trpc.foundingBeta.me.useQuery();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [now, setNow] = useState(() => Date.now());
  const [rating, setRating] = useState<number | undefined>();
  const [useful, setUseful] = useState("");
  const [willingnessToPay, setWillingnessToPay] = useState<"definitely" | "probably" | "maybe" | "no" | undefined>();
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const submit = trpc.foundingBeta.submitFeedback.useMutation({
    onSuccess: () => {
      utils.foundingBeta.me.invalidate();
      toast.success("Thank you. Your private beta feedback has been saved.");
    },
    onError: error => toast.error(error.message),
  });

  if (isLoading) return <WorkspaceFrame eyebrow="Founding Beta" title="Loading your beta status." description="Cresna is confirming whether this signed-in email has an active or completed one-time beta invitation."><div className="grid min-h-[300px] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></WorkspaceFrame>;
  if (!data?.invite) return <WorkspaceFrame eyebrow="Founding Beta" title="Beta access is invitation-only." description="Cresna Free is available to every signed-in workspace. Founding Beta is a separate one-time, two-day invitation for selected testers."><EmptyWorkspaceCard title="No active beta invitation">If the owner invited you, sign in with the exact email that received the message. Cresna will begin your two-day beta period after that first sign-in.</EmptyWorkspaceCard></WorkspaceFrame>;

  const expiresAt = data.invite.expiresAt ? new Date(data.invite.expiresAt).getTime() : now;
  const active = data.invite.status === "active" && expiresAt > now;
  const expired = !active;
  const daysElapsed = data.invite.activatedAt ? Math.floor((now - new Date(data.invite.activatedAt).getTime()) / 86_400_000) : 0;
  const checkpoint = expired ? "day_7" : daysElapsed >= 1 ? "day_3" : "day_1";
  const prompt = checkpoint === "day_1" ? "Was the Growth Profile useful?" : checkpoint === "day_3" ? "Which opportunity was most useful?" : "Your beta access has ended. What should Cresna improve before you choose a paid plan?";
  const completed = data.feedback.some(item => item.checkpoint === checkpoint);
  const ready = checkpoint === "day_1" ? Boolean(rating) : checkpoint === "day_3" ? Boolean(useful.trim()) : Boolean(willingnessToPay && feedback.trim());
  const submitCheckpointFeedback = () => {
    if (checkpoint === "day_1" && rating) submit.mutate({ checkpoint, growthProfileRating: rating, feedbackText: feedback || undefined });
    if (checkpoint === "day_3" && useful.trim()) submit.mutate({ checkpoint, mostUsefulRecommendation: useful, feedbackText: feedback || undefined });
    if (checkpoint === "day_7" && willingnessToPay && feedback.trim()) submit.mutate({ checkpoint, willingnessToPay, feedbackText: feedback });
  };

  return <WorkspaceFrame eyebrow="Founding Beta" title={active ? "Your two-day beta window is active." : "Beta access has ended."} description={active ? "This one-time beta entitlement is tied to the exact invited email. When it ends, Cresna will request private feedback before you continue with a paid plan." : "Your temporary beta entitlement has ended. Submit the final private feedback check-in, then choose Cresna Free, Pro, or Growth from Billing."}>
    <section className="max-w-2xl rounded-[1.35rem] border border-border bg-card p-6 text-card-foreground sm:p-8">
      <div className={`rounded-2xl border p-5 ${active ? "border-primary/30 bg-primary/10" : "border-border bg-secondary"}`}><div className="flex items-center gap-3"><Clock3 className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} /><div><p className="eyebrow text-[10px] text-muted-foreground">{active ? "Time remaining" : "Beta window complete"}</p><p className="mt-1 text-2xl font-extrabold tracking-[-0.05em]">{active ? formatRemaining(expiresAt - now) : "00:00:00"}</p></div></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{active ? `Access ends ${new Date(expiresAt).toLocaleString()}. This beta email cannot activate another temporary period.` : "Your workspace now uses Cresna Free unless you choose a paid plan. Final feedback is required for this completed beta record."}</p></div>
      <p className="eyebrow mt-7 text-[10px] text-muted-foreground">{expired ? "Final feedback" : checkpoint === "day_1" ? "First-use check-in" : "Mid-beta check-in"}</p><h2 className="mt-3 text-2xl font-extrabold tracking-[-0.05em]">{prompt}</h2>
      {completed ? <div className="mt-7 rounded-xl bg-secondary p-4"><p className="text-sm font-semibold text-secondary-foreground">Thanks—this private check-in has been saved.</p>{expired ? <Button onClick={() => setLocation("/app/billing")} className="mt-4 rounded-full">View plans and billing</Button> : null}</div> : <form className="mt-7 space-y-6" onSubmit={event => { event.preventDefault(); submitCheckpointFeedback(); }}>{checkpoint === "day_1" ? <fieldset><legend className="text-xs font-bold">Growth Profile rating</legend><div className="mt-3 flex gap-2">{[1, 2, 3, 4, 5].map(value => <Button key={value} type="button" size="icon" variant={rating === value ? "default" : "outline"} onClick={() => setRating(value)} className="rounded-full text-sm font-bold">{value}</Button>)}</div></fieldset> : null}{checkpoint === "day_3" ? <label className="grid gap-2 text-xs font-bold">Which opportunity was most useful?<Textarea value={useful} onChange={event => setUseful(event.target.value)} required className="min-h-24 border-input bg-background text-sm font-normal" placeholder="Tell Cresna which recommendation helped and why." /></label> : null}{checkpoint === "day_7" ? <><fieldset><legend className="text-xs font-bold">Would you pay $19/month for Cresna Pro?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{[["definitely", "Definitely"], ["probably", "Probably"], ["maybe", "Maybe"], ["no", "No"]].map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${willingnessToPay === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-secondary"}`}><input className="sr-only" type="radio" name="willingness" checked={willingnessToPay === value} onChange={() => setWillingnessToPay(value as typeof willingnessToPay)} /><span className={`h-3 w-3 rounded-full ${willingnessToPay === value ? "bg-primary-foreground" : "border border-current"}`} />{label}</label>)}</div></fieldset><label className="grid gap-2 text-xs font-bold">What is the one thing Cresna should improve?<Textarea value={feedback} onChange={event => setFeedback(event.target.value)} required placeholder="Your most useful request, in your own words." className="min-h-28 border-input bg-background text-sm font-normal" /></label></> : <label className="grid gap-2 text-xs font-bold">Anything else you want Cresna to know? <span className="font-normal text-muted-foreground">Optional</span><Textarea value={feedback} onChange={event => setFeedback(event.target.value)} placeholder="Share any extra context." className="min-h-24 border-input bg-background text-sm font-normal" /></label>}<Button type="submit" disabled={submit.isPending || !ready} className="h-11 rounded-full px-6 text-xs font-bold">{submit.isPending ? "Saving…" : expired ? "Save final feedback" : "Send private feedback"}</Button></form>}
    </section>
  </WorkspaceFrame>;
}
