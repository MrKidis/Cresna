import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { startLogin } from "@/const";
import { ArrowRight, Check, ChevronDown, CircleDot, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

const plans = [
  {
    name: "Pro",
    price: "$19",
    description: "A focused growth loop for independent owners who need useful work, not another chatbot.",
    features: ["Business Brain + transparent Growth Score", "Evidence-backed Opportunity Engine", "75 custom AI actions per month"],
  },
  {
    name: "Growth",
    price: "$49",
    description: "Four times more custom-AI capacity for growing brands that turn opportunities into reviewed improvements each week.",
    features: ["Everything in Pro", "300 custom AI actions per month", "Four times the monthly custom-AI capacity"],
  },
];

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const goToWorkspace = () => (user ? setLocation("/app") : startLogin());
  const signIn = () => startLogin();

  return (
    <div id="top" className="cresna-public-shell min-h-screen overflow-hidden bg-background text-foreground">
      <header className="relative z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container flex h-[72px] items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-center gap-3 text-left" aria-label="Cresna home">
                <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-[10px] bg-[#17201e]"><img src="/manus-storage/cresna-growth-arrow-logo_f6234d79.png" alt="Cresna growth arrow" className="h-full w-full object-contain p-0.5" /></span>
                <span className="text-[15px] font-extrabold tracking-[-0.04em] text-foreground">cresna</span>
          </button>
          <nav className="hidden items-center gap-8 text-[13px] font-semibold text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#method">Method</a>
            <a className="transition-colors hover:text-foreground" href="#pricing">Pricing</a>
          </nav>
          <div className="flex items-center gap-2"><ThemeToggle className="hidden sm:inline-flex" />{!user ? <button type="button" onClick={signIn} className="hidden px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground sm:inline-flex">Sign in</button> : null}<Button onClick={goToWorkspace} className="h-10 rounded-full bg-[#17201e] px-5 text-xs font-bold text-[#f8f7f2] shadow-none hover:bg-[#293630]">
            {user ? "Open workspace" : "Start free trial"}<ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button></div>
        </div>
      </header>

      <main>
        <section className="grid-hairline border-b border-[#17201e]/10">
          <div className="container grid min-h-[660px] items-end gap-12 py-20 lg:grid-cols-[1.12fr_0.88fr] lg:py-24">
            <div className="max-w-[760px] pb-4">
              <p className="eyebrow reveal-up mb-7 text-[10px] font-medium text-[#65706b]">Revenue intelligence for Shopify</p>
              <h1 className="reveal-up text-balance text-[clamp(3.25rem,7.1vw,6.75rem)] font-extrabold leading-[0.94] tracking-[-0.075em]">
                See what to do <span className="relative whitespace-nowrap"><span className="relative z-10">next.</span><span className="absolute inset-x-[-3%] bottom-[8%] -z-0 h-[25%] bg-[#d9fa55]" /></span>
              </h1>
              <p className="reveal-up-delay mt-8 max-w-xl text-pretty text-[17px] leading-8 text-[#53605a]">
                Cresna turns approved Shopify data into a Business Brain, finds evidence-backed opportunities, creates reviewable work, and measures what changed after you act.
              </p>
              <div className="reveal-up-delay mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Button onClick={goToWorkspace} size="lg" className="h-14 rounded-full bg-[#17201e] px-7 text-sm font-bold text-[#f8f7f2] hover:bg-[#293630]">Start your 14-day trial <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <span className="text-xs font-medium text-[#65706b]">No store data is read until you approve access.</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[510px]">
              <div className="absolute -inset-6 rounded-[2.4rem] bg-[#d9fa55]/60 blur-3xl" />
              <div className="relative overflow-hidden rounded-[1.5rem] border border-[#17201e]/15 bg-[#fdfdfb] p-3 shadow-[0_22px_65px_rgba(23,32,30,0.13)]">
                <div className="rounded-[1.1rem] border border-[#17201e]/10 bg-[#f5f5f1] p-5">
                  <div className="mb-8 flex items-center justify-between"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#d9fa55] ring-4 ring-[#d9fa55]/30" /><span className="eyebrow text-[9px] font-medium text-[#65706b]">Growth intelligence</span></div><Sparkles className="h-4 w-4 text-[#7c9b1e]" /></div>
                  <div className="rounded-xl border border-[#17201e]/10 bg-[#fdfdfb] p-5">
                    <p className="eyebrow text-[9px] text-[#65706b]">Your next opportunity</p>
                    <p className="mt-3 text-[20px] font-bold leading-7 tracking-[-0.04em]">Connect a store, set a goal, and turn real evidence into an approved action plan.</p>
                    <div className="mt-7 flex items-end gap-2" aria-hidden="true">{[31, 46, 39, 64, 52, 83, 69, 100].map((height, index) => <span key={index} className="w-full rounded-t-sm bg-[#d9fa55]" style={{ height: `${height}px`, opacity: 0.45 + index * 0.06 }} />)}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">{[["Observe", "Sales signals"], ["Prioritize", "Best next move"], ["Measure", "Revenue change"]].map(([label, detail], index) => <div key={label} className="rounded-xl border border-[#17201e]/10 bg-[#fdfdfb] p-3"><span className="font-mono text-[10px] text-[#7c9b1e]">0{index + 1}</span><p className="mt-4 text-xs font-bold tracking-[-0.03em]">{label}</p><p className="mt-1 text-[10px] leading-4 text-[#65706b]">{detail}</p></div>)}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="method" className="border-b border-[#17201e]/10 bg-[#17201e] text-[#f8f7f2]">
          <div className="container grid gap-12 py-20 lg:grid-cols-[0.75fr_1.25fr] lg:py-28">
            <div><p className="eyebrow text-[10px] text-[#b6c1bb]">Built for decisions</p><h2 className="mt-5 text-[clamp(2.2rem,4vw,3.8rem)] font-extrabold leading-[0.98] tracking-[-0.065em]">A tighter loop from signal to growth.</h2></div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 sm:grid-cols-3">{[["01", "Diagnose", "Translate store activity into a clear view of revenue, products, refunds, and checkout friction."], ["02", "Decide", "Receive specific, evidence-based actions ranked by expected revenue impact and confidence."], ["03", "Learn", "Mark an action done and compare the agreed pre-action period with the resulting outcome."]].map(([number, title, copy]) => <article key={number} className="min-h-[258px] bg-[#17201e] p-6"><p className="font-mono text-[11px] text-[#d9fa55]">{number}</p><h3 className="mt-14 text-xl font-bold tracking-[-0.04em]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#b6c1bb]">{copy}</p></article>)}</div>
          </div>
        </section>

        <section id="pricing" className="container py-20 lg:py-28">
          <div className="max-w-2xl"><p className="eyebrow text-[10px] text-[#65706b]">Straightforward pricing</p><h2 className="mt-5 text-[clamp(2.3rem,4.6vw,4.3rem)] font-extrabold leading-[0.95] tracking-[-0.07em]">A plan that grows with your operating rhythm.</h2><p className="mt-6 text-[15px] leading-7 text-[#65706b]">Start with a 14-day trial. Upgrade when Cresna becomes part of how your team chooses what to work on next.</p></div>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">{plans.map((plan, index) => <article key={plan.name} className={`rounded-[1.4rem] border p-7 ${index === 1 ? "border-[#17201e] bg-[#17201e] text-[#f8f7f2] shadow-[0_20px_50px_rgba(23,32,30,0.14)]" : "border-[#17201e]/15 bg-[#fdfdfb]"}`}><div className="flex items-start justify-between"><div><p className={`eyebrow text-[10px] ${index === 1 ? "text-[#d9fa55]" : "text-[#65706b]"}`}>{plan.name}</p><p className="mt-5 text-5xl font-extrabold tracking-[-0.07em]">{plan.price}</p><p className={`mt-2 text-xs ${index === 1 ? "text-[#b6c1bb]" : "text-[#65706b]"}`}>per month</p></div>{index === 1 && <span className="rounded-full bg-[#d9fa55] px-3 py-1.5 text-[10px] font-bold text-[#17201e]">Most complete</span>}</div><p className={`mt-6 text-sm leading-6 ${index ? "text-[#d9e1dc]" : "text-[#53605a]"}`}>{plan.description}</p><ul className="mt-7 space-y-3">{plan.features.map(feature => <li key={feature} className={`flex gap-3 text-sm ${index ? "text-[#e4e9e5]" : "text-[#53605a]"}`}><Check className={`mt-0.5 h-4 w-4 shrink-0 ${index ? "text-[#d9fa55]" : "text-[#7c9b1e]"}`} />{feature}</li>)}</ul><Button onClick={goToWorkspace} className={`mt-9 h-11 w-full rounded-full text-xs font-bold ${index ? "bg-[#d9fa55] text-[#17201e] hover:bg-[#e4ff83]" : "bg-[#17201e] text-[#f8f7f2] hover:bg-[#293630]"}`}>Start free trial <ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></article>)}</div>
          <p className="mt-6 text-center text-xs text-[#65706b]">Annual subscriptions receive two months free at checkout.</p>
        </section>
      </main>
      <footer className="border-t border-[#17201e]/10 py-7"><div className="container flex flex-col gap-4 text-xs text-[#65706b] sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-[#17201e]">cresna</span><span>Growth intelligence for independent commerce.</span><a href="#top" className="inline-flex items-center gap-1 font-semibold text-[#17201e]">Back to top <ChevronDown className="h-3 w-3 rotate-180" /></a></div></footer>
    </div>
  );
}
