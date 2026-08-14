import { and, desc, eq, gte, lte } from "drizzle-orm";
import { recommendationActions, recommendations, storeDailyMetrics } from "../drizzle/schema";
import { getAnalyticsOverview, getDb } from "./db";
import { invokeLLM } from "./_core/llm";

type Candidate = {
  category: "underperforming_sku" | "high_refunds" | "abandoned_cart" | "margin_erosion" | "restock" | "product_copy";
  evidence: string;
  maximumImpact: number;
  effortLevel: "low" | "medium" | "high";
};

type ProductMetric = Awaited<ReturnType<typeof getAnalyticsOverview>>["productMetrics"][number];

export function buildCandidates(overview: Awaited<ReturnType<typeof getAnalyticsOverview>>): Candidate[] {
  const store = overview.store;
  if (!store || overview.dailyMetrics.length < 7) return [];
  const candidates: Candidate[] = [];
  const daily = overview.dailyMetrics;
  const revenue = daily.reduce((sum, row) => sum + Number(row.netRevenue), 0);
  const checkouts = daily.reduce((sum, row) => sum + row.checkoutCount, 0);
  const abandoned = daily.reduce((sum, row) => sum + row.abandonedCheckoutCount, 0);
  const productGroups = new Map<string, ProductMetric[]>();
  for (const row of overview.productMetrics) productGroups.set(row.shopifyProductId, [...(productGroups.get(row.shopifyProductId) ?? []), row]);

  if (checkouts >= 10 && abandoned / checkouts >= 0.2) candidates.push({ category: "abandoned_cart", evidence: `${abandoned} of ${checkouts} recorded checkout events were abandoned across ${daily.length} reporting days.`, maximumImpact: Math.round(revenue * (abandoned / checkouts) * 0.2), effortLevel: "medium" });
  for (const [, rows] of Array.from(productGroups.entries())) {
    const latest = rows[0];
    if (!latest) continue;
    const orders = rows.reduce((sum, row) => sum + row.orderCount, 0);
    const units = rows.reduce((sum, row) => sum + row.unitsSold, 0);
    const refunds = rows.reduce((sum, row) => sum + row.refundCount, 0);
    const gross = rows.reduce((sum, row) => sum + Number(row.grossRevenue), 0);
    const cost = rows.reduce((sum, row) => sum + Number(row.costEstimate || 0), 0);
    const refunded = rows.reduce((sum, row) => sum + Number(row.refundAmount), 0);
    if (orders >= 5 && refunds / orders >= 0.15) candidates.push({ category: "high_refunds", evidence: `${latest.title} recorded ${refunds} refunds across ${orders} orders (${Math.round((refunds / orders) * 100)}%) in available reporting data.`, maximumImpact: Math.round(refunded), effortLevel: "medium" });
    if (cost > 0 && gross > 0 && cost / gross >= 0.75) candidates.push({ category: "margin_erosion", evidence: `${latest.title} has available product cost inputs equal to ${Math.round((cost / gross) * 100)}% of gross revenue across the reporting window.`, maximumImpact: Math.round(gross - cost), effortLevel: "medium" });
    if (units > 0 && units <= 2) candidates.push({ category: "underperforming_sku", evidence: `${latest.title} sold only ${units} units across the ${overview.dailyMetrics.length}-day reporting window.`, maximumImpact: Math.round(gross * 0.2), effortLevel: "low" });
    if (units >= 5 && latest.sku && latest.title) candidates.push({ category: "restock", evidence: `${latest.title} sold ${units} units across ${orders} orders. Inventory should be reviewed alongside the product’s current Shopify inventory data.`, maximumImpact: Math.round(gross * 0.15), effortLevel: "low" });
  }
  return rankCandidates(candidates).slice(0, 12);
}

export function rankCandidates(candidates: Candidate[]) {
  return [...candidates].sort((left, right) => right.maximumImpact - left.maximumImpact || left.effortLevel.localeCompare(right.effortLevel));
}

export async function generateRecommendationsForUser(userId: number) {
  const overview = await getAnalyticsOverview(userId);
  if (!overview.store) throw new Error("Connect a Shopify store before generating recommendations");
  const candidates = buildCandidates(overview);
  if (!candidates.length) return { generated: 0, reason: "At least seven days of sufficient store activity are required before recommendations can be generated." };
  const result = await invokeLLM({
    model: "gpt-5-mini",
    max_tokens: 2200,
    messages: [
      { role: "system", content: "You are Cresna's ecommerce analyst. Use only the supplied evidence. Do not invent metrics, products, causes, or outcomes. Recommendations must be cautious estimates, should not recommend a discount unless the evidence explicitly supports it, and must give a concrete seller action. Return JSON only." },
      { role: "user", content: JSON.stringify({ currency: overview.store.currency, reportingDays: overview.dailyMetrics.length, candidates }) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "merchant_momentum_recommendations",
        strict: true,
        schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  category: { type: "string", enum: ["underperforming_sku", "high_refunds", "abandoned_cart", "margin_erosion", "restock", "product_copy"] },
                  title: { type: "string" },
                  rationale: { type: "string" },
                  recommendedAction: { type: "string" },
                  evidence: { type: "string" },
                  estimatedImpactLow: { type: "integer", minimum: 0 },
                  estimatedImpactHigh: { type: "integer", minimum: 0 },
                  confidencePercent: { type: "integer", minimum: 0, maximum: 100 },
                  effortLevel: { type: "string", enum: ["low", "medium", "high"] },
                },
                required: ["category", "title", "rationale", "recommendedAction", "evidence", "estimatedImpactLow", "estimatedImpactHigh", "confidencePercent", "effortLevel"],
                additionalProperties: false,
              },
            },
          },
          required: ["recommendations"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = result.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("AI analysis returned no structured recommendation output");
  const analysis = JSON.parse(content) as { recommendations: Array<{ category: Candidate["category"]; title: string; rationale: string; recommendedAction: string; evidence: string; estimatedImpactLow: number; estimatedImpactHigh: number; confidencePercent: number; effortLevel: Candidate["effortLevel"] }> };
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(recommendations).where(and(eq(recommendations.storeId, overview.store.id), eq(recommendations.status, "open")));
  await Promise.all(analysis.recommendations.map(async (item, index) => {
    const relevantCandidate = candidates.find(candidate => candidate.category === item.category);
    const cap = relevantCandidate?.maximumImpact ?? 0;
    const low = Math.min(Math.max(0, item.estimatedImpactLow), cap);
    const high = Math.min(Math.max(low, item.estimatedImpactHigh), cap);
    await db.insert(recommendations).values({ storeId: overview.store.id, category: item.category, title: item.title.slice(0, 255), rationale: item.rationale, recommendedAction: item.recommendedAction, evidence: item.evidence, estimatedImpactLow: low.toFixed(2), estimatedImpactHigh: high.toFixed(2), confidencePercent: item.confidencePercent, effortLevel: relevantCandidate?.effortLevel ?? item.effortLevel, priorityRank: index + 1 });
  }));
  return { generated: analysis.recommendations.length, reason: null };
}

export async function approveRecommendationForUser(userId: number, recommendationId: number) {
  const overview = await getAnalyticsOverview(userId);
  if (!overview.store) throw new Error("Connect a Shopify store before approving an opportunity");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const recommendation = (await db.select().from(recommendations).where(and(eq(recommendations.id, recommendationId), eq(recommendations.storeId, overview.store.id))).limit(1))[0];
  if (!recommendation) throw new Error("Opportunity not found");
  if (recommendation.status !== "open") throw new Error("Only open opportunities can be approved");
  await db.update(recommendations).set({ status: "approved" }).where(eq(recommendations.id, recommendationId));
  return { approved: true };
}

export async function completeRecommendationForUser(userId: number, recommendationId: number) {
  const overview = await getAnalyticsOverview(userId);
  if (!overview.store || !overview.dailyMetrics.length) throw new Error("A reporting baseline is required before an action can be completed");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const recommendation = (await db.select().from(recommendations).where(and(eq(recommendations.id, recommendationId), eq(recommendations.storeId, overview.store.id))).limit(1))[0];
  if (!recommendation) throw new Error("Recommendation not found");
  if (recommendation.status !== "approved") throw new Error("Approve this opportunity before marking the change complete");
  const baselineEnd = overview.dailyMetrics.at(-1)!.metricDate;
  const baselineStart = new Date(baselineEnd.getTime() - 13 * 24 * 60 * 60 * 1000);
  const baseline = overview.dailyMetrics.filter(row => row.metricDate >= baselineStart && row.metricDate <= baselineEnd).reduce((sum, row) => sum + Number(row.netRevenue), 0);
  if (baseline <= 0) throw new Error("A positive revenue baseline is required before measurement can begin");
  const comparisonStart = new Date(Math.max(Date.now(), baselineEnd.getTime() + 24 * 60 * 60 * 1000));
  const comparisonEnd = new Date(comparisonStart.getTime() + 13 * 24 * 60 * 60 * 1000);
  await db.insert(recommendationActions).values({ recommendationId, actedAt: new Date(), baselineStart, baselineEnd, baselineRevenue: baseline.toFixed(2), comparisonStart, comparisonEnd, measurementStatus: "waiting" });
  await db.update(recommendations).set({ status: "completed" }).where(eq(recommendations.id, recommendationId));
  return { baselineRevenue: baseline, comparisonEnd };
}

export async function refreshRevenueImpactForStore(storeId: number) {
  const db = await getDb();
  if (!db) return;
  const actions = await db.select().from(recommendationActions).innerJoin(recommendations, eq(recommendationActions.recommendationId, recommendations.id)).where(and(eq(recommendations.storeId, storeId), eq(recommendationActions.measurementStatus, "waiting"))).orderBy(desc(recommendationActions.comparisonEnd));
  for (const row of actions) {
    const action = row.recommendationActions;
    const metrics = await db.select().from(storeDailyMetrics).where(and(eq(storeDailyMetrics.storeId, storeId), gte(storeDailyMetrics.metricDate, action.comparisonStart), lte(storeDailyMetrics.metricDate, action.comparisonEnd)));
    if (!metrics.length || Math.max(...metrics.map(metric => metric.metricDate.getTime())) < action.comparisonEnd.getTime()) continue;
    const comparisonRevenue = metrics.reduce((sum, metric) => sum + Number(metric.netRevenue), 0);
    await db.update(recommendationActions).set({ comparisonRevenue: comparisonRevenue.toFixed(2), revenueChange: (comparisonRevenue - Number(action.baselineRevenue)).toFixed(2), measurementStatus: "measured" }).where(eq(recommendationActions.id, action.id));
  }
}
