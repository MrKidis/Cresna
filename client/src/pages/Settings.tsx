import { UnpaidWorkspaceState, WorkspaceFrame } from "@/components/WorkspaceFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUnpaidPreview } from "@/contexts/UnpaidPreviewContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Bell, PlayCircle, ShieldCheck, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Settings() {
  const { isUnpaidPreview, isCheckingPreview } = useUnpaidPreview();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: profile } = trpc.profile.me.useQuery();
  const { data: onboarding } = trpc.onboarding.me.useQuery();
  const { data: intelligence } = trpc.intelligence.overview.useQuery();
  const { data: preferences } = trpc.notifications.preferences.useQuery();
  const [workspaceName, setWorkspaceName] = useState("");
  const [betaUpdates, setBetaUpdates] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);

  useEffect(() => setWorkspaceName(profile?.workspaceName || ""), [profile?.workspaceName]);
  useEffect(() => { if (preferences) { setBetaUpdates(Boolean(preferences.betaUpdates)); setProductUpdates(Boolean(preferences.productUpdates)); } }, [preferences]);

  const updateWorkspaceName = trpc.profile.updateWorkspaceName.useMutation({ onSuccess: () => { utils.profile.me.invalidate(); toast.success("Workspace name saved"); }, onError: () => toast.error("Could not save your workspace name") });
  const replayTutorial = trpc.onboarding.setStatus.useMutation({ onSuccess: () => { utils.onboarding.me.invalidate(); toast.success("Cresna’s tutorial will start now"); }, onError: () => toast.error("Could not restart the tutorial") });
  const savePreferences = trpc.notifications.updatePreferences.useMutation({ onSuccess: () => { utils.notifications.preferences.invalidate(); toast.success("Communication preferences saved"); }, onError: () => toast.error("Could not save communication preferences") });

  if (isUnpaidPreview || isCheckingPreview) return <WorkspaceFrame eyebrow="Settings" title="Your Cresna workspace." description="Manage identity, workspace preferences, onboarding, and store-connection controls."><UnpaidWorkspaceState title="Settings are unavailable in the unpaid preview" detail="This preview intentionally contains no account, connection, communication-preference, or billing record." /></WorkspaceFrame>;

  return <WorkspaceFrame eyebrow="Settings" title="Your Cresna workspace." description="Manage identity, workspace preferences, onboarding, communication choices, and store-connection controls. Payment credentials and Shopify tokens are never displayed here.">
    <div className="grid max-w-4xl gap-5">
      <section className="rounded-[1.35rem] border border-border bg-card p-6 text-card-foreground sm:p-8"><p className="eyebrow text-[10px] text-muted-foreground">Profile</p><div className="mt-7 grid gap-6 border-t border-border pt-7 sm:grid-cols-2"><Info label="Name" value={user?.name || "Not provided"} /><Info label="Email" value={user?.email || "Not provided"} /></div><form className="mt-8 border-t border-border pt-7" onSubmit={event => { event.preventDefault(); updateWorkspaceName.mutate({ workspaceName }); }}><Label htmlFor="workspace-name" className="text-xs font-bold text-foreground">Workspace name</Label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><Input id="workspace-name" value={workspaceName} maxLength={120} onChange={event => setWorkspaceName(event.target.value)} placeholder="e.g., Northstar Commerce" className="h-11 rounded-xl border-border bg-background" /><Button type="submit" disabled={updateWorkspaceName.isPending} className="h-11 rounded-full px-5 text-xs font-bold">{updateWorkspaceName.isPending ? "Saving…" : "Save name"}</Button></div><p className="mt-3 text-[11px] text-muted-foreground">This name labels your Cresna workspace. Your sign-in identity remains managed by your account provider.</p></form></section>
      <section className="grid gap-5 md:grid-cols-2"><SettingsCard icon={PlayCircle} eyebrow="Onboarding" title="Need a refresher?" detail={<>Tutorial status: <strong className="text-foreground">{onboarding?.status === "completed" ? "completed" : onboarding?.status === "dismissed" ? "skipped" : "not started"}</strong>. It never opens again automatically after you complete or skip it.</>} action={replayTutorial.isPending ? "Restarting…" : "Replay tutorial"} onAction={() => replayTutorial.mutate({ status: "not_started" })} disabled={replayTutorial.isPending} /><SettingsCard icon={Store} eyebrow="Connected store" title={intelligence?.store ? intelligence.store.myshopifyDomain : "No Shopify store connected"} detail={intelligence?.store ? "Review connected-store evidence and connection controls before refreshing data." : "Connect only when you are ready to approve Cresna’s stated Shopify scopes."} action={intelligence?.store ? "Manage connection" : "Review connection"} onAction={() => setLocation("/app/connect")} /></section>
      <section className="rounded-[1.35rem] border border-border bg-card p-6 text-card-foreground"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Bell className="h-5 w-5" /></span><div><p className="eyebrow text-[10px] text-muted-foreground">Communication choices</p><h2 className="mt-2 text-lg font-extrabold tracking-[-0.04em]">Choose non-transactional updates.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">These settings control optional Cresna product and beta updates. Security, account, and billing notices are handled separately when required.</p></div></div><div className="mt-6 divide-y divide-border border-y border-border"><PreferenceRow label="Beta updates" detail="Receive news relevant to your invited beta access and feedback cycle." checked={betaUpdates} onChange={setBetaUpdates} /><PreferenceRow label="Product updates" detail="Receive occasional updates about Cresna features and workflow improvements." checked={productUpdates} onChange={setProductUpdates} /></div><Button onClick={() => savePreferences.mutate({ betaUpdates, productUpdates })} disabled={savePreferences.isPending} className="mt-5 rounded-full text-xs font-bold">{savePreferences.isPending ? "Saving…" : "Save communication choices"}</Button></section>
      <section className="rounded-[1.35rem] border border-border bg-card p-6 text-card-foreground"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><div><p className="eyebrow text-[10px] text-muted-foreground">Data permissions</p><h2 className="mt-2 text-lg font-extrabold tracking-[-0.04em]">Cresna only uses the store data you approve.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Store reads are explained before Shopify authorization. Cresna does not display your Shopify token, payment credentials, or saved payment details. Merchant-approved AI drafts remain reviewable and do not publish changes automatically.</p></div></div></section>
    </div>
  </WorkspaceFrame>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] font-bold text-muted-foreground">{label}</p><p className="mt-2 text-sm font-semibold text-foreground">{value}</p></div>; }
function SettingsCard({ icon: Icon, eyebrow, title, detail, action, onAction, disabled }: { icon: typeof Store; eyebrow: string; title: string; detail: React.ReactNode; action: string; onAction: () => void; disabled?: boolean }) { return <article className="rounded-[1.35rem] border border-border bg-card p-6 text-card-foreground"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Icon className="h-5 w-5" /></span><div><p className="eyebrow text-[10px] text-muted-foreground">{eyebrow}</p><h2 className="mt-2 text-lg font-extrabold tracking-[-0.04em]">{title}</h2></div></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{detail}</p><Button onClick={onAction} disabled={disabled} variant="outline" className="mt-5 rounded-full text-xs font-bold">{action}</Button></article>; }
function PreferenceRow({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) { return <div className="flex items-center justify-between gap-5 py-4"><div><p className="text-sm font-bold">{label}</p><p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{detail}</p></div><Switch checked={checked} onCheckedChange={onChange} aria-label={label} /></div>; }
