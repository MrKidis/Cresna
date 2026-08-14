import DashboardLayout from "@/components/DashboardLayout";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
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
        <button onClick={() => setLocation("/")} className="mb-10 inline-flex items-center gap-2 text-[11px] font-bold text-[#65706b] transition-colors hover:text-[#17201e]"><ArrowLeft className="h-3.5 w-3.5" /> Back to site</button>
        <div className="flex flex-col gap-7 border-b border-[#17201e]/10 pb-9 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl"><p className="eyebrow text-[10px] text-[#65706b]">{eyebrow}</p><h1 className="mt-3 text-balance text-4xl font-extrabold tracking-[-0.06em] sm:text-5xl">{title}</h1><p className="mt-4 max-w-xl text-[15px] leading-7 text-[#65706b]">{description}</p></div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#65706b]"><span className="h-2 w-2 rounded-full bg-[#d9fa55] ring-4 ring-[#d9fa55]/40" />Private Cresna workspace</span>
        </div>
        <div className="py-9">{children}</div>
      </div>
    </DashboardLayout>
  );
}

export function EmptyWorkspaceCard({ title, children, action, onAction }: { title: string; children: React.ReactNode; action?: string; onAction?: () => void }) {
  return <section className="rounded-[1.35rem] border border-[#17201e]/12 bg-[#fdfdfb] p-6 shadow-[0_8px_30px_rgba(23,32,30,0.04)] sm:p-8"><div className="grid min-h-[295px] place-items-center border border-dashed border-[#17201e]/16 rounded-xl bg-[#f5f5f1] px-6 text-center"><div className="max-w-md"><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#d9fa55] text-[#17201e]"><ArrowUpRight className="h-5 w-5" /></span><h2 className="mt-5 text-xl font-extrabold tracking-[-0.045em]">{title}</h2><div className="mt-3 text-sm leading-6 text-[#65706b]">{children}</div>{action && onAction ? <button onClick={onAction} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#17201e] px-5 py-3 text-xs font-bold text-[#f8f7f2] hover:bg-[#293630]">{action}<ArrowUpRight className="h-3.5 w-3.5" /></button> : null}</div></div></section>;
}
