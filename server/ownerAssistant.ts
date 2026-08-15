import { invokeLLM, type Message } from "./_core/llm.ts";
import { getOwnerOverview } from "./db.ts";

export type OwnerOverviewSummaryInput = {
  totalUsers: number;
  connectedStores: number;
  stripeLinkedWorkspaces: number;
  recommendationsGenerated: number;
  recommendationsCompleted: number;
  aiDraftsGenerated: number;
  aiDraftsApproved: number;
  outcomesMeasured: number;
  positiveOutcomes: number;
  betaFeedback: unknown[];
  betaInvites: Array<{ status: "invited" | "active" | "expired" | "revoked" }>;
};

export function summarizeOwnerOverview(overview: OwnerOverviewSummaryInput) {
  return {
    totalUsers: overview.totalUsers,
    connectedStores: overview.connectedStores,
    stripeLinkedWorkspaces: overview.stripeLinkedWorkspaces,
    recommendationsGenerated: overview.recommendationsGenerated,
    recommendationsCompleted: overview.recommendationsCompleted,
    aiDraftsGenerated: overview.aiDraftsGenerated,
    aiDraftsApproved: overview.aiDraftsApproved,
    outcomesMeasured: overview.outcomesMeasured,
    positiveOutcomes: overview.positiveOutcomes,
    betaFeedbackEntries: overview.betaFeedback.length,
    betaInvitationCounts: overview.betaInvites.reduce<Record<string, number>>((counts, invite) => {
      counts[invite.status] = (counts[invite.status] || 0) + 1;
      return counts;
    }, {}),
  };
}

export function buildOwnerAssistantMessages(question: string, overview: OwnerOverviewSummaryInput): Message[] {
  const platformSnapshot = summarizeOwnerOverview(overview);
  return [
    {
      role: "system",
      content: "You are Cresna Owner Intelligence, a private operating assistant. Answer only from the supplied aggregated platform snapshot. Never infer, reveal, request, or fabricate individual merchant, customer, order, catalog, or payment data. Do not claim you browsed, queried tools, or saw information outside the snapshot. Be candid about small sample sizes and missing metrics. Use concise Markdown with these sections when useful: **Operating read**, **Evidence used**, **Next best move**, and **What is not known yet**. Turn the owner question into one practical platform decision, not generic advice. Treat this snapshot as confidential.",
    },
    {
      role: "user",
      content: `Aggregated Cresna platform snapshot:\n${JSON.stringify(platformSnapshot)}\n\nOwner question:\n${question}`,
    },
  ];
}

export function buildOwnerAssistantFallback(question: string, overview: OwnerOverviewSummaryInput) {
  const snapshot = summarizeOwnerOverview(overview);
  const activeBeta = snapshot.betaInvitationCounts.active || 0;
  const completionRate = snapshot.recommendationsGenerated > 0 ? Math.round((snapshot.recommendationsCompleted / snapshot.recommendationsGenerated) * 100) : null;
  const approvalRate = snapshot.aiDraftsGenerated > 0 ? Math.round((snapshot.aiDraftsApproved / snapshot.aiDraftsGenerated) * 100) : null;
  const nextStep = snapshot.connectedStores === 0
    ? "Prioritize the Shopify connection and consent journey: no store evidence exists yet."
    : snapshot.recommendationsGenerated === 0
      ? "Prioritize the first evidence scan for connected workspaces before adding more product surface area."
      : snapshot.outcomesMeasured === 0
        ? "Prioritize getting merchants from approved actions to measured outcomes so Cresna can learn from real results."
        : "Review the strongest measured outcome and turn its evidence pattern into the next product or onboarding experiment.";

  return `## Private platform pulse\n\n### Operating read\nFor **${question.trim() || "this platform review"}**, the current aggregate evidence points to the next step below. Cresna is using the verified platform counts available for this response; it does not use merchant-level records here.\n\n### Evidence used\n- **Users:** ${snapshot.totalUsers}\n- **Connected stores:** ${snapshot.connectedStores}\n- **Active beta testers:** ${activeBeta}\n- **Opportunities generated:** ${snapshot.recommendationsGenerated}${completionRate === null ? "" : ` (${completionRate}% completed)`}\n- **AI drafts:** ${snapshot.aiDraftsGenerated}${approvalRate === null ? "" : ` (${approvalRate}% approved)`}\n- **Measured outcomes:** ${snapshot.outcomesMeasured}\n- **Structured beta feedback entries:** ${snapshot.betaFeedbackEntries}\n\n### Next best move\n${nextStep}\n\n### What is not known yet\nThis review cannot identify individual merchants, customer behavior, order records, catalog items, or payment details. It also cannot establish causality until more connected workspaces generate and measure outcomes.`;
}

export async function answerOwnerAssistant(question: string) {
  const overview = await getOwnerOverview();
  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 700,
      reasoning: { effort: "low" },
      messages: buildOwnerAssistantMessages(question, overview),
    });
    const content = response.choices[0]?.message.content;
    const answer = typeof content === "string" ? content.trim() : Array.isArray(content) ? content.map(part => part.type === "text" ? part.text : "").join("\n").trim() : "";
    if (answer) return { answer, snapshot: summarizeOwnerOverview(overview) };
    console.warn("[Owner Assistant] Provider returned no usable content; using aggregate fallback.");
  } catch (error) {
    console.warn("[Owner Assistant] Provider request failed; using aggregate fallback.", error);
  }
  return { answer: buildOwnerAssistantFallback(question, overview), snapshot: summarizeOwnerOverview(overview) };
}
