import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpRight, LockKeyhole } from "lucide-react";
import { useLocation } from "wouter";

export function WorkspaceFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [, setLocation] = useLocation();
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <Button variant="ghost" onClick={() => setLocation("/")} className="mb-10 h-auto px-0 text-[11px] font-bold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back to site</Button>
        <div className="flex flex-col gap-7 border-b border-[#17201e]/10 pb-9 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl"><p className="eyebrow text-[10px] text-[#65706b]">{eyebrow}</p><h1 className="mt-3 text-balance text-4xl font-extrabold tracking-[-0.06em] sm:text-5xl">{title}</h1><p className="mt-4 max-w-xl text-[15px] leading-7 text-[#65706b]">{description}</p></div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#65706b]"><span className="h-2 w-2 rounded-full bg-[#d9fa55] ring-4 ring-[#d9fa55]/40" />Private Cresna workspace</span>
        </div>
        <div className="py-9">{children}</div>
      </div>
    </DashboardLayout>
  );
}

export function UnpaidWorkspaceState({ title, detail }: { title: string; detail: string }) {
  const [, setLocation] = useLocation();
  return <section className="rounded-[1.35rem] border border-border bg-card p-6 text-card-foreground shadow-[0_8px_30px_rgba(23,32,30,0.04)] sm:p-8"><div className="grid min-h-[295px] place-items-center rounded-xl border border-dashed border-border bg-muted px-6 text-center"><div className="max-w-lg"><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-foreground"><LockKeyhole className="h-5 w-5" /></span><p className="eyebrow mt-5 text-[10px] text-muted-foreground">Verified unpaid preview</p><h2 className="mt-3 text-xl font-extrabold tracking-[-0.045em]">{title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{detail} Cresna shows no merchant data and disables paid actions in this no-subscription state.</p><Button onClick={() => setLocation("/app/preview/billing")} className="mt-6 rounded-full text-xs">View trial and plan choices<ArrowUpRight className="h-3.5 w-3.5" /></Button></div></div></section>;
}

export function EmptyWorkspaceCard({ title, children, action, onAction }: { title: string; children: React.ReactNode; action?: string; onAction?: () => void }) {
  return <section className="rounded-[1.35rem] border border-border bg-card p-6 text-card-foreground shadow-[0_8px_30px_rgba(23,32,30,0.04)] sm:p-8"><div className="grid min-h-[295px] place-items-center border border-dashed border-border rounded-xl bg-muted px-6 text-center"><div className="max-w-md"><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-foreground"><ArrowUpRight className="h-5 w-5" /></span><h2 className="mt-5 text-xl font-extrabold tracking-[-0.045em]">{title}</h2><div className="mt-3 text-sm leading-6 text-muted-foreground">{children}</div>{action && onAction ? <Button onClick={onAction} className="mt-6 rounded-full text-xs">{action}<ArrowUpRight className="h-3.5 w-3.5" /></Button> : null}</div></div></section>;
}
