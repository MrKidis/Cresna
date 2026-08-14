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

export async function answerOwnerAssistant(question: string) {
  const overview = await getOwnerOverview();
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 700,
    messages: buildOwnerAssistantMessages(question, overview),
  });
  const content = response.choices[0]?.message.content;
  const answer = typeof content === "string"
    ? content.trim()
    : content?.map(part => part.type === "text" ? part.text : "").join("\n").trim();

  if (!answer) throw new Error("The owner assistant did not return a usable response");
  return { answer, snapshot: summarizeOwnerOverview(overview) };
}
