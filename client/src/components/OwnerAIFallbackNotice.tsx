import React from "react";

export function OwnerAIFallbackNotice({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <p role="status" className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-[#d9e1dc]">Cresna could not complete a narrative response. The verified aggregate platform snapshot remains available; no merchant-level records were accessed.</p>;
}
