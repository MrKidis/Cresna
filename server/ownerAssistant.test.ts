import { describe, expect, it } from "vitest";
import { buildOwnerAssistantFallback, buildOwnerAssistantMessages, summarizeOwnerOverview } from "./ownerAssistant";

const overview = {
  totalUsers: 12,
  connectedStores: 8,
  stripeLinkedWorkspaces: 3,
  recommendationsGenerated: 24,
  recommendationsCompleted: 6,
  aiDraftsGenerated: 18,
  aiDraftsApproved: 10,
  outcomesMeasured: 4,
  positiveOutcomes: 3,
  betaFeedback: [{ id: 1 }],
  betaInvites: [{ status: "invited" as const }, { status: "active" as const }, { status: "active" as const }],
};

describe("owner assistant privacy boundary", () => {
  it("reduces owner intelligence to aggregate platform counts", () => {
    expect(summarizeOwnerOverview(overview)).toEqual({
      totalUsers: 12,
      connectedStores: 8,
      stripeLinkedWorkspaces: 3,
      recommendationsGenerated: 24,
      recommendationsCompleted: 6,
      aiDraftsGenerated: 18,
      aiDraftsApproved: 10,
      outcomesMeasured: 4,
      positiveOutcomes: 3,
      betaFeedbackEntries: 1,
      betaInvitationCounts: { invited: 1, active: 2 },
    });
  });

  it("directs the model to avoid individual merchant and customer data", () => {
    const messages = buildOwnerAssistantMessages("What should I do this week?", overview);
    expect(messages[0].content).toContain("Never infer, reveal, request, or fabricate");
    expect(messages[1].content).toContain('"connectedStores":8');
    expect(messages[1].content).not.toContain("tester@example.com");
  });

  it("provides a safe, useful aggregate fallback when the model returns no text", () => {
    const fallback = buildOwnerAssistantFallback("What should I do this week?", overview);
    expect(fallback).toContain("**Users:** 12");
    expect(fallback).toContain("**Connected stores:** 8");
    expect(fallback).toContain("Suggested operating focus");
    expect(fallback).not.toContain("tester@example.com");
  });
});
