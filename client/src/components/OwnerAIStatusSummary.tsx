import React from "react";

export function OwnerAIStatusSummary({ isLoading, emptyStateMessage }: { isLoading: boolean; emptyStateMessage: string }) {
  return <p aria-live="polite" className="sr-only">{isLoading ? "Reviewing the verified aggregate platform snapshot…" : emptyStateMessage}</p>;
}
