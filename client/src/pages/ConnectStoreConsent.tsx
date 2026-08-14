import { EmptyWorkspaceCard, WorkspaceFrame } from "@/components/WorkspaceFrame";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CircleCheck, Database, LockKeyhole, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const dataPermissions = [
  {
    key: "orders",
    title: "Orders and checkout activity",
    scope: "read_orders",
    reads: "Order totals, refunds, discounts, line items, and checkout events from the current reporting window.",
    purpose: "Cresna calculates revenue, refund, product-performance, and checkout-friction signals.",
  },
  {
    key: "products",
    title: "Products and collections",
    scope: "read_products",
    reads: "Product titles, descriptions, SEO fields, inventory, prices, media counts, and collection metadata.",
    purpose: "Cresna scans catalog clarity and creates merchant-reviewed content drafts using your actual product facts.",
  },
  {
    key: "customers",
    title: "Customer identifiers for daily counts",
    scope: "read_customers",
    reads: "Customer identifiers present on orders, used only to calculate aggregate daily customer counts.",
    purpose: "Cresna does not send customer messages or retain customer profiles, names, emails, or addresses in its analytics tables.",
  },
] as const;

export default function ConnectStoreConsent() {
  const [, setLocation] = useLocation();
  const [shopDomain, setShopDomain] = useState("");
  const [accepted, setAccepted] = useState<Record<string, boolean>>({ orders: false, products: false, customers: false });
  const beginAuthorization = trpc.shopify.begin.useMutation({ onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl), onError: error => toast.error(error.message) });
  const sync = trpc.shopify.sync.useMutation({ onSuccess: result => toast.success(`Synced ${result.daysSynced} reporting days and ${result.productsSynced} products`), onError: error => toast.error(error.message) });
  const allConsentAccepted = useMemo(() => dataPermissions.every(permission => accepted[permission.key]), [accepted]);

  return (
    <WorkspaceFrame eyebrow="Step 1 of 3 · Connect" title="Make an informed data connection." description="Cresna will not start Shopify authorization until you review and actively confirm every requested read scope below.">
      <section className="mb-5 rounded-[1.1rem] border border-[#17201e]/10 bg-[#eceee8] p-4"><div className="grid gap-3 text-xs font-bold sm:grid-cols-3"><span className="flex items-center gap-2 text-[#17201e]"><CircleCheck className="h-4 w-4 text-[#7c9b1e]" />1. Review and connect</span><button type="button" onClick={() => setLocation("/app/profile")} className="flex items-center gap-2 text-left text-[#53605a] hover:text-[#17201e]"><span className="grid h-4 w-4 place-items-center rounded-full border border-current text-[9px]">2</span>Tell Cresna about your goals</button><span className="flex items-center gap-2 text-[#53605a]"><span className="grid h-4 w-4 place-items-center rounded-full border border-current text-[9px]">3</span>Review Growth Profile</span></div></section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-[1.35rem] border border-[#17201e]/12 bg-[#fdfdfb] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow text-[10px] text-[#65706b]">Data sharing review</p><h2 className="mt-3 text-2xl font-extrabold tracking-[-0.05em]">You control the connection.</h2></div><span className="rounded-full border border-[#7c9b1e]/25 bg-[#ecf3d6] px-3 py-1.5 text-[10px] font-bold text-[#526b1a]">Read-only scopes</span></div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#65706b]">Read each data category, then check the acknowledgement. Cresna does not edit products, prices, inventory, orders, customers, or your Shopify theme. Every generated recommendation or draft remains private until you decide to use it.</p>
          <div className="mt-7 space-y-3">
            {dataPermissions.map(permission => <label key={permission.key} className={`flex cursor-pointer gap-4 rounded-2xl border p-4 transition-colors ${accepted[permission.key] ? "border-[#7c9b1e]/35 bg-[#f2f7e3]" : "border-[#17201e]/10 bg-[#f5f5f1] hover:border-[#17201e]/20"}`}><input type="checkbox" checked={accepted[permission.key]} onChange={event => setAccepted(previous => ({ ...previous, [permission.key]: event.target.checked }))} className="mt-0.5 h-4 w-4 shrink-0 accent-[#17201e]" aria-describedby={`${permission.key}-detail`} /><span><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-[#17201e]">{permission.title}</span><code className="rounded bg-[#17201e]/7 px-1.5 py-0.5 font-mono text-[10px] text-[#53605a]">{permission.scope}</code></span><span id={`${permission.key}-detail`} className="mt-1.5 block text-xs leading-5 text-[#53605a]"><strong className="font-semibold text-[#17201e]">Cresna reads:</strong> {permission.reads}</span><span className="mt-1 block text-xs leading-5 text-[#65706b]"><strong className="font-semibold text-[#17201e]">Why:</strong> {permission.purpose}</span></span></label>)}
          </div>

          <form className="mt-8 max-w-xl space-y-3" onSubmit={event => { event.preventDefault(); if (!allConsentAccepted) return; beginAuthorization.mutate({ shopDomain }); }}>
            <Label htmlFor="shop-domain" className="text-xs font-bold text-[#34413b]">Store domain</Label>
            <Input id="shop-domain" value={shopDomain} onChange={event => setShopDomain(event.target.value)} placeholder="your-store.myshopify.com" className="h-12 rounded-xl border-[#17201e]/15 bg-[#f5f5f1]" required />
            <button type="submit" disabled={beginAuthorization.isPending || !allConsentAccepted} className="mt-3 inline-flex h-12 w-full items-center justify-center gap-3 rounded-full bg-[#17201e] px-5 text-xs font-bold text-[#f8f7f2] hover:bg-[#293630] disabled:cursor-not-allowed disabled:opacity-45"><img src="/manus-storage/shopify-primary-logo_3d6b973f.svg" alt="Shopify" className="h-5 w-auto rounded-sm bg-white px-1.5 py-0.5" />{beginAuthorization.isPending ? "Opening Shopify…" : "Continue to Shopify"}</button>
            <p className="text-[11px] leading-5 text-[#7a847e]">{allConsentAccepted ? "You will review the same requested scopes again in Shopify’s authorization screen before access is granted." : "Check each data-sharing acknowledgement to enable Shopify authorization."}</p>
          </form>
          <button type="button" onClick={() => sync.mutate()} disabled={sync.isPending} className="mt-5 text-[11px] font-bold text-[#53605a] underline underline-offset-4 hover:text-[#17201e] disabled:opacity-60">{sync.isPending ? "Refreshing store scan…" : "Refresh an already connected store"}</button>
        </div>

        <aside className="rounded-[1.35rem] bg-[#17201e] p-6 text-[#f8f7f2] sm:p-8">
          <LockKeyhole className="h-5 w-5 text-[#d9fa55]" />
          <p className="eyebrow mt-8 text-[10px] text-[#b6c1bb]">What Cresna stores</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.05em]">Evidence, not blind automation.</h2>
          <ul className="mt-6 space-y-4 text-sm leading-6 text-[#cbd4ce]"><li><span className="font-bold text-[#d9fa55]">Stored:</span> encrypted Shopify access token, connected-store metadata, catalog fields, and daily aggregate store/product metrics used for Cresna’s analysis.</li><li><span className="font-bold text-[#d9fa55]">Not stored in analytics:</span> customer names, emails, addresses, payment details, or customer messages.</li><li><span className="font-bold text-[#d9fa55]">Never automated:</span> storefront changes, product publishing, pricing changes, or messages to customers.</li></ul>
          <div className="mt-7 rounded-xl border border-white/12 bg-white/5 p-4"><ShieldCheck className="h-4 w-4 text-[#d9fa55]" /><p className="mt-3 text-xs font-bold">Revoke access whenever you need.</p><p className="mt-1.5 text-xs leading-5 text-[#cbd4ce]">Uninstall Cresna from Shopify Admin → Settings → Apps and sales channels to revoke the app token. Disconnecting prevents future syncs; your historical Cresna workspace records remain subject to your data-deletion request.</p></div>
          <div className="mt-4 flex gap-2 rounded-xl border border-[#d9fa55]/20 bg-[#d9fa55]/8 p-4 text-xs leading-5 text-[#e8f3c1]"><Database className="mt-0.5 h-4 w-4 shrink-0 text-[#d9fa55]" />Cresna’s recommendation learning uses only aggregated, minimum-sample outcome patterns. It never treats another merchant’s data as your store evidence.</div>
        </aside>
      </section>
    </WorkspaceFrame>
  );
}
