import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const { data: profile } = trpc.profile.me.useQuery();
  const [workspaceName, setWorkspaceName] = useState("");
  const utils = trpc.useUtils();
  const updateWorkspaceName = trpc.profile.updateWorkspaceName.useMutation({ onSuccess: () => { utils.profile.me.invalidate(); toast.success("Workspace name saved"); }, onError: () => toast.error("Could not save your workspace name") });
  useEffect(() => { setWorkspaceName(profile?.workspaceName || ""); }, [profile?.workspaceName]);
  return <WorkspaceFrame eyebrow="Account" title="Your Cresna workspace." description="Manage the identity attached to your workspace. Store connection and payment credentials are never displayed here."><section className="max-w-2xl rounded-[1.35rem] border border-[#17201e]/12 bg-[#fdfdfb] p-6 sm:p-8"><p className="eyebrow text-[10px] text-[#65706b]">Profile</p><div className="mt-7 grid gap-6 border-t border-[#17201e]/10 pt-7 sm:grid-cols-2"><div><p className="text-[11px] font-bold text-[#65706b]">Name</p><p className="mt-2 text-sm font-semibold text-[#17201e]">{user?.name || "Not provided"}</p></div><div><p className="text-[11px] font-bold text-[#65706b]">Email</p><p className="mt-2 text-sm font-semibold text-[#17201e]">{user?.email || "Not provided"}</p></div></div><form className="mt-8 border-t border-[#17201e]/10 pt-7" onSubmit={event => { event.preventDefault(); updateWorkspaceName.mutate({ workspaceName }); }}><Label htmlFor="workspace-name" className="text-xs font-bold text-[#34413b]">Workspace name</Label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><Input id="workspace-name" value={workspaceName} maxLength={120} onChange={event => setWorkspaceName(event.target.value)} placeholder="e.g., Northstar Commerce" className="h-11 rounded-xl border-[#17201e]/15 bg-[#f5f5f1]" /><Button type="submit" disabled={updateWorkspaceName.isPending} className="h-11 rounded-full bg-[#17201e] px-5 text-xs font-bold text-[#f8f7f2] hover:bg-[#293630]">{updateWorkspaceName.isPending ? "Saving…" : "Save name"}</Button></div><p className="mt-3 text-[11px] text-[#65706b]">This name labels your Cresna workspace. Your sign-in identity remains managed by your account provider.</p></form></section></WorkspaceFrame>;
}
