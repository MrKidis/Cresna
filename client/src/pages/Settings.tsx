import { UnpaidWorkspaceState, WorkspaceFrame } from "@/components/WorkspaceFrame";
import { useUnpaidPreview } from "@/contexts/UnpaidPreviewContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { isUnpaidPreview, isCheckingPreview } = useUnpaidPreview();
  const { user } = useAuth();
  const { data: profile } = trpc.profile.me.useQuery();
  const [workspaceName, setWorkspaceName] = useState("");
  const utils = trpc.useUtils();
  const updateWorkspaceName = trpc.profile.updateWorkspaceName.useMutation({ onSuccess: () => { utils.profile.me.invalidate(); toast.success("Workspace name saved"); }, onError: () => toast.error("Could not save your workspace name") });
  useEffect(() => { setWorkspaceName(profile?.workspaceName || ""); }, [profile?.workspaceName]);
  return <WorkspaceFrame eyebrow="Account" title="Your Cresna workspace." description="Manage the identity attached to your workspace. Store connection and payment credentials are never displayed here.">{isUnpaidPreview || isCheckingPreview ? <UnpaidWorkspaceState title="Workspace settings unlock with a trial" detail="This real Settings route is running without paid, trial, or beta access, so account records and editing controls are intentionally hidden." /> : <section className="max-w-2xl rounded-[1.35rem] border border-border bg-card p-6 text-card-foreground sm:p-8"><p className="eyebrow text-[10px] text-muted-foreground">Profile</p><div className="mt-7 grid gap-6 border-t border-border pt-7 sm:grid-cols-2"><div><p className="text-[11px] font-bold text-muted-foreground">Name</p><p className="mt-2 text-sm font-semibold text-foreground">{user?.name || "Not provided"}</p></div><div><p className="text-[11px] font-bold text-muted-foreground">Email</p><p className="mt-2 text-sm font-semibold text-foreground">{user?.email || "Not provided"}</p></div></div><form className="mt-8 border-t border-border pt-7" onSubmit={event => { event.preventDefault(); updateWorkspaceName.mutate({ workspaceName }); }}><Label htmlFor="workspace-name" className="text-xs font-bold text-foreground">Workspace name</Label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><Input id="workspace-name" value={workspaceName} maxLength={120} onChange={event => setWorkspaceName(event.target.value)} placeholder="e.g., Northstar Commerce" className="h-11 rounded-xl border-border bg-background" /><Button type="submit" disabled={updateWorkspaceName.isPending} className="h-11 rounded-full px-5 text-xs font-bold">{updateWorkspaceName.isPending ? "Saving…" : "Save name"}</Button></div><p className="mt-3 text-[11px] text-muted-foreground">This name labels your Cresna workspace. Your sign-in identity remains managed by your account provider.</p></form></section>}</WorkspaceFrame>;
}
