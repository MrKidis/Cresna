import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EmptyWorkspaceCard, UnpaidWorkspaceState } from "../client/src/components/WorkspaceFrame";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("wouter", () => ({ useLocation: () => ["/app/billing", vi.fn()] }));
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Cresna route-owned surfaces", () => {
  it("renders the verified unpaid billing state with a truthful plan handoff", () => {
    const html = renderToStaticMarkup(React.createElement(UnpaidWorkspaceState, {
      title: "Billing is not available in the unpaid preview",
      detail: "This verified preview intentionally has no account, subscription, or purchase record.",
    }));
    expect(html).toContain("Verified unpaid preview");
    expect(html).toContain("View trial and plan choices");
    expect(html).toContain("shows no merchant data and disables paid actions");
  });

  it("renders the connect-first state used by AI Studio and commerce routes", () => {
    const html = renderToStaticMarkup(React.createElement(EmptyWorkspaceCard, {
      title: "Connect and scan a Shopify catalog first",
      action: "Connect store",
      onAction: vi.fn(),
      children: "Cresna only creates custom drafts from products it can verify in your connected catalog.",
    }));
    expect(html).toContain("Connect and scan a Shopify catalog first");
    expect(html).toContain("Cresna only creates custom drafts");
    expect(html).toContain("Connect store");
  });

  it("keeps route-owned Billing, Settings, and AI Studio copy present", () => {
    expect(read("client/src/pages/Billing.tsx")).toContain("Choose the Cresna capacity that fits your operating rhythm.");
    expect(read("client/src/pages/Settings.tsx")).toContain("Your Cresna workspace.");
    expect(read("client/src/pages/AIStudio.tsx")).toContain("Turn a signal into merchant-approved work.");
    expect(read("client/src/pages/AIStudio.tsx")).toContain("MerchantDraftReviewCard");
  });
});
