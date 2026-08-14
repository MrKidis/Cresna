import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, MailCheck, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

export default function BetaAccess() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [note, setNote] = useState("");
  const requestAccess = trpc.betaAccess.request.useMutation();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    requestAccess.mutate({ email, storeUrl: storeUrl || undefined, note: note || undefined });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container flex h-[72px] items-center justify-between">
          <Button type="button" variant="ghost" onClick={() => setLocation("/")} className="h-auto gap-3 px-0 py-0 text-left hover:bg-transparent">
            <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-[10px] bg-primary"><img src="/manus-storage/cresna-growth-arrow-logo_f6234d79.png" alt="Cresna growth arrow" className="h-full w-full object-contain p-0.5" /></span>
            <span className="text-[15px] font-extrabold tracking-[-0.04em] text-foreground">Cresna</span>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <section className="container grid gap-10 py-12 lg:min-h-[calc(100vh-72px)] lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:py-16">
        <div className="max-w-xl">
          <p className="eyebrow text-[10px] text-muted-foreground">Cresna founding beta</p>
          <h1 className="mt-4 text-balance text-[clamp(2.75rem,5.5vw,5.5rem)] font-extrabold leading-[.93] tracking-[-.075em]">Join when your workspace is ready.</h1>
          <p className="mt-6 max-w-lg text-pretty text-[16px] leading-7 text-muted-foreground">Cresna is currently invite-only. Requesting access adds you to the beta review list—it does not start a trial, connect a store, or create a subscription.</p>
          <div className="mt-9 space-y-4">
            {[
              [ShieldCheck, "You stay in control", "No Shopify data is accessed unless you later approve a specific connection."],
              [MailCheck, "A real invitation is required", "When you are approved, Cresna sends an invitation to this exact email. Your one-time two-day beta period begins only after you sign in."],
            ].map(([Icon, title, description]) => <div key={title as string} className="flex gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-bold">{title as string}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description as string}</p></div></div>)}
          </div>
          <Button type="button" variant="ghost" className="mt-8 -ml-3 gap-2 text-muted-foreground hover:text-foreground" onClick={() => setLocation("/")}><ArrowLeft className="h-4 w-4" />Back to Cresna</Button>
        </div>

        <div className="rounded-[1.6rem] border border-border bg-card p-6 text-card-foreground shadow-xl shadow-black/5 sm:p-8">
          {requestAccess.isSuccess ? <div className="py-9 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><CheckCircle2 className="h-6 w-6" /></span><h2 className="mt-5 text-2xl font-extrabold tracking-[-0.05em]">Request received.</h2><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">We recorded your request. Cresna will only email an invitation after the owner reviews and approves it. Until then, no workspace access has been granted.</p><Button className="mt-7 rounded-full" onClick={() => setLocation("/")}>Return home</Button></div> : <form onSubmit={submit} className="space-y-5"><div><p className="eyebrow text-[10px] text-muted-foreground">Request beta access</p><h2 className="mt-3 text-2xl font-extrabold tracking-[-0.05em]">Tell us where Cresna can help.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">We use your note only to review the request. It is not used to train on private store data.</p></div><label className="block space-y-2 text-sm font-semibold"><span>Email address</span><Input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@brand.com" /></label><label className="block space-y-2 text-sm font-semibold"><span>Store URL <span className="font-normal text-muted-foreground">(optional)</span></span><Input value={storeUrl} onChange={event => setStoreUrl(event.target.value)} placeholder="your-store.myshopify.com" /></label><label className="block space-y-2 text-sm font-semibold"><span>What do you want to improve? <span className="font-normal text-muted-foreground">(optional)</span></span><Textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1200} placeholder="For example: I want clearer product and repeat-customer opportunities." className="min-h-28 resize-y" /></label>{requestAccess.isError ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs leading-5 text-destructive">Cresna could not save the request just now. Please try again.</p> : null}<Button type="submit" disabled={requestAccess.isPending} className="h-11 w-full rounded-full text-sm font-bold">{requestAccess.isPending ? "Saving request…" : "Request beta access"}</Button><p className="text-center text-[11px] leading-5 text-muted-foreground">A request is not a trial and does not create a subscription. We will only contact you when an approved invitation is ready.</p></form>}
        </div>
      </section>
    </main>
  );
}
