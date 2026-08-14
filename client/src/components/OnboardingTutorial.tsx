import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { shouldAutoShowOnboarding } from "../../../server/onboardingPolicy";
import { ArrowRight, CheckCircle2, CircleDot, Store, Target, WandSparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const steps = [
  { icon: CircleDot, eyebrow: "01 · Start with context", title: "Tell Cresna what growth means for your brand.", detail: "Choose goals and save only the brand context you approve. Cresna treats unanswered fields as missing—not facts.", action: "/app/profile", actionLabel: "Set growth priorities" },
  { icon: Store, eyebrow: "02 · Connect only when ready", title: "Connect Shopify with a clear permission boundary.", detail: "Cresna asks before reading store data. You can see the exact scopes, purpose, and disconnect path before authorizing anything.", action: "/app/connect", actionLabel: "Review Shopify connection" },
  { icon: Target, eyebrow: "03 · Review evidence", title: "Start with evidence before acting.", detail: "Use the Opportunity Engine to review what Cresna found, the source evidence, expected effort, and data limitations.", action: "/app/actions", actionLabel: "Open Opportunity Engine" },
  { icon: WandSparkles, eyebrow: "04 · Approve every draft", title: "Use AI as a reviewable collaborator.", detail: "Cresna can prepare drafts from your approved context. It does not publish Shopify changes automatically.", action: "/app/ai-studio", actionLabel: "Visit AI Action Studio" },
] as const;

export function OnboardingTutorial() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const { data } = trpc.onboarding.me.useQuery();
  const utils = trpc.useUtils();
  const setStatus = trpc.onboarding.setStatus.useMutation({ onSuccess: () => utils.onboarding.me.invalidate() });
  const current = steps[step];
  const Icon = current.icon;
  const open = shouldAutoShowOnboarding(data?.status);

  const complete = (destination?: string) => {
    setStatus.mutate({ status: "completed" }, { onSuccess: () => { utils.onboarding.me.invalidate(); if (destination) setLocation(destination); } });
  };

  return <Dialog open={open} onOpenChange={nextOpen => { if (!nextOpen && !setStatus.isPending) setStatus.mutate({ status: "dismissed" }); }}>
    <DialogContent className="max-w-xl overflow-hidden border-border bg-card p-0 text-card-foreground sm:rounded-[1.65rem]">
      <div className="border-b border-border bg-secondary/55 px-6 py-5 sm:px-8"><div className="flex items-center justify-between gap-4"><div><p className="eyebrow text-[10px] text-muted-foreground">Cresna quick start</p><DialogTitle className="mt-2 text-xl font-extrabold tracking-[-0.04em]">A practical first tour, then you are in control.</DialogTitle></div><span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">Step {step + 1} of {steps.length}</span></div><div className="mt-5 flex gap-1.5">{steps.map((item, index) => <span key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-border"}`} />)}</div></div>
      <div className="px-6 py-8 sm:px-8"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Icon className="h-5 w-5" /></span><p className="eyebrow mt-7 text-[10px] text-muted-foreground">{current.eyebrow}</p><DialogDescription className="mt-3 text-2xl font-extrabold leading-tight tracking-[-0.05em] text-card-foreground">{current.title}</DialogDescription><p className="mt-4 text-sm leading-6 text-muted-foreground">{current.detail}</p></div>
      <div className="flex flex-col-reverse gap-3 border-t border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"><Button variant="ghost" onClick={() => setStatus.mutate({ status: "dismissed" })} disabled={setStatus.isPending} className="rounded-full text-xs font-bold">Skip for now</Button><div className="flex gap-2"><Button variant="outline" onClick={() => setStep(currentStep => Math.max(0, currentStep - 1))} disabled={step === 0 || setStatus.isPending} className="rounded-full text-xs font-bold">Back</Button>{step < steps.length - 1 ? <Button onClick={() => setStep(currentStep => currentStep + 1)} className="rounded-full text-xs font-bold">Next <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button> : <Button onClick={() => complete(current.action)} disabled={setStatus.isPending} className="rounded-full text-xs font-bold">Finish and continue <CheckCircle2 className="ml-1.5 h-3.5 w-3.5" /></Button>}</div></div>
    </DialogContent>
  </Dialog>;
}
