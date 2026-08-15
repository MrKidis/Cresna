import { invokeLLM, type Message, type Tool } from "./_core/llm.ts";
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

const OWNER_TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "calculate_platform_rates",
      description: "Calculate verified aggregate completion, AI approval, and positive-outcome rates from the supplied platform snapshot.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "prioritize_platform_experiment",
      description: "Select the highest-leverage aggregate platform experiment from verified counts.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

export function runOwnerPlatformTools(overview: OwnerOverviewSummaryInput) {
  const snapshot = summarizeOwnerOverview(overview);
  const rate = (numerator: number, denominator: number) => denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
  const rates = {
    recommendationCompletionRate: rate(snapshot.recommendationsCompleted, snapshot.recommendationsGenerated),
    aiDraftApprovalRate: rate(snapshot.aiDraftsApproved, snapshot.aiDraftsGenerated),
    positiveOutcomeRate: rate(snapshot.positiveOutcomes, snapshot.outcomesMeasured),
  };
  const priority = snapshot.connectedStores === 0
    ? { priority: "store_connection", rationale: "No connected stores means Cresna has no merchant evidence to analyze." }
    : snapshot.recommendationsGenerated === 0
      ? { priority: "first_scan", rationale: "Connected workspaces have not yet produced an opportunity scan." }
      : snapshot.outcomesMeasured === 0
        ? { priority: "outcome_measurement", rationale: "Cresna needs approved actions and measured outcomes before it can validate impact." }
        : { priority: "replicate_positive_pattern", rationale: "Measured outcomes exist; inspect the strongest aggregate pattern and replicate it in onboarding or product guidance." };
  return { rates, priority };
}

export function buildOwnerAssistantMessages(question: string, overview: OwnerOverviewSummaryInput): Message[] {
  const platformSnapshot = summarizeOwnerOverview(overview);
  const toolOutputs = runOwnerPlatformTools(overview);
  return [
    {
      role: "system",
      content: "You are Cresna Owner Intelligence, a private operating assistant. Answer only from the supplied aggregated platform snapshot and Cresna-calculated tool outputs. Never infer, reveal, request, or fabricate individual merchant, customer, order, catalog, or payment data. Do not claim you browsed or saw information outside the snapshot. Be candid about small sample sizes and missing metrics. Use concise Markdown with these sections when useful: **Operating read**, **Evidence used**, **Next best move**, and **What is not known yet**. Turn the owner question into one practical platform decision, not generic advice. Treat this snapshot as confidential.",
    },
    {
      role: "user",
      content: `Aggregated Cresna platform snapshot:\n${JSON.stringify(platformSnapshot)}\n\nVerified Cresna tool outputs:\n${JSON.stringify(toolOutputs)}\n\nOwner question:\n${question}`,
    },
  ];
}

export function buildOwnerAssistantFallback(question: string, overview: OwnerOverviewSummaryInput) {
  const snapshot = summarizeOwnerOverview(overview);
  const tools = runOwnerPlatformTools(overview);
  const activeBeta = snapshot.betaInvitationCounts.active || 0;
  const nextStep = tools.priority.rationale;

  return `## Private platform pulse\n\n### Operating read\nFor **${question.trim() || "this platform review"}**, the verified aggregate evidence points to **${tools.priority.priority.replaceAll("_", " ")}**. Cresna is using platform counts only; it does not use merchant-level records here.\n\n### Evidence used\n- **Users:** ${snapshot.totalUsers}\n- **Connected stores:** ${snapshot.connectedStores}\n- **Active beta testers:** ${activeBeta}\n- **Opportunities generated:** ${snapshot.recommendationsGenerated}\n- **Recommendation completion rate:** ${tools.rates.recommendationCompletionRate === null ? "not measurable yet" : `${tools.rates.recommendationCompletionRate}%`}\n- **AI draft approval rate:** ${tools.rates.aiDraftApprovalRate === null ? "not measurable yet" : `${tools.rates.aiDraftApprovalRate}%`}\n- **Measured outcomes:** ${snapshot.outcomesMeasured}\n- **Positive outcome rate:** ${tools.rates.positiveOutcomeRate === null ? "not measurable yet" : `${tools.rates.positiveOutcomeRate}%`}\n- **Structured beta feedback entries:** ${snapshot.betaFeedbackEntries}\n\n### Next best move\n${nextStep}\n\n### What is not known yet\nThis review cannot identify individual merchants, customer behavior, order records, catalog items, or payment details. It also cannot establish causality until more connected workspaces generate and measure outcomes.`;
}

export async function answerOwnerAssistant(question: string) {
  const overview = await getOwnerOverview();
  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 700,
      reasoning: { effort: "low" },
      tools: OWNER_TOOLS,
      toolChoice: "auto",
      messages: buildOwnerAssistantMessages(question, overview),
    });
    const content = response.choices[0]?.message.content;
    const answer = typeof content === "string" ? content.trim() : Array.isArray(content) ? content.map(part => part.type === "text" ? part.text : "").join("\n").trim() : "";
    if (answer) return { answer, snapshot: summarizeOwnerOverview(overview), toolOutputs: runOwnerPlatformTools(overview) };
    console.warn("[Owner Assistant] Provider returned no usable content; using aggregate fallback.");
  } catch (error) {
    console.warn("[Owner Assistant] Provider request failed; using aggregate fallback.", error);
  }
  return { answer: buildOwnerAssistantFallback(question, overview), snapshot: summarizeOwnerOverview(overview), toolOutputs: runOwnerPlatformTools(overview) };
}
