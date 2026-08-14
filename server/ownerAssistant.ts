import { invokeLLM, type Message } from "./_core/llm";
import { getOwnerOverview } from "./db";

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
      content: "You are Cresna Owner Intelligence, a private operating assistant. Answer using only the supplied aggregated platform snapshot. Never infer, reveal, request, or fabricate any individual merchant, customer, order, catalog, or payment data. Be candid about small sample sizes and missing metrics. Give concise, evidence-aware operating recommendations in Markdown. Treat this snapshot as confidential.",
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
  const completionRate = snapshot.recommendationsGenerated > 0
    ? Math.round((snapshot.recommendationsCompleted / snapshot.recommendationsGenerated) * 100)
    : null;
  const approvalRate = snapshot.aiDraftsGenerated > 0
    ? Math.round((snapshot.aiDraftsApproved / snapshot.aiDraftsGenerated) * 100)
    : null;
  const nextStep = snapshot.connectedStores === 0
    ? "Prioritize the Shopify connection and consent journey: no store evidence exists yet."
    : snapshot.recommendationsGenerated === 0
      ? "Prioritize the first evidence scan for connected workspaces before adding more product surface area."
      : snapshot.outcomesMeasured === 0
        ? "Prioritize getting merchants from approved actions to measured outcomes so Cresna can learn from real results."
        : "Review the strongest measured outcome and turn its evidence pattern into the next product or onboarding experiment.";

  return `## Verified platform snapshot\n\nI could not obtain a narrative model response for this question, so I am using Cresna's stored aggregate metrics only.\n\n- **Users:** ${snapshot.totalUsers}\n- **Connected stores:** ${snapshot.connectedStores}\n- **Active beta testers:** ${activeBeta}\n- **Opportunities generated:** ${snapshot.recommendationsGenerated}${completionRate === null ? "" : ` (${completionRate}% completed)`}\n- **AI drafts:** ${snapshot.aiDraftsGenerated}${approvalRate === null ? "" : ` (${approvalRate}% approved)`}\n- **Measured outcomes:** ${snapshot.outcomesMeasured}\n- **Structured beta feedback entries:** ${snapshot.betaFeedbackEntries}\n\n### Suggested operating focus\n${nextStep}\n\n> Your question was recorded only for this response: “${question.trim() || "Platform review"}”. This fallback does not access or expose merchant-level, customer, order, catalog, or payment data.`;
}

export async function answerOwnerAssistant(question: string) {
  const overview = await getOwnerOverview();
  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 700,
      messages: buildOwnerAssistantMessages(question, overview),
    });
    const content = response.choices[0]?.message.content;
    const answer = typeof content === "string"
      ? content.trim()
      : Array.isArray(content) ? content.map(part => part.type === "text" ? part.text : "").join("\n").trim() : "";

    if (answer) return { answer, snapshot: summarizeOwnerOverview(overview) };
    console.warn("[Owner Assistant] Provider returned no usable content; using aggregate fallback.");
  } catch (error) {
    console.warn("[Owner Assistant] Provider request failed; using aggregate fallback.", error);
  }

  return { answer: buildOwnerAssistantFallback(question, overview), snapshot: summarizeOwnerOverview(overview) };
}
