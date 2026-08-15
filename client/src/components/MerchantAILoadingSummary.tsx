import React from "react";

export function MerchantAILoadingSummary({ isLoading }: { isLoading: boolean }) {
  return <p aria-live="polite" className="sr-only">{isLoading ? "Reading verified store evidence and drafting a reviewable action…" : "Merchant AI ready for a verified store signal."}</p>;
}
