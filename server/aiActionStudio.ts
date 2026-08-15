import { and, desc, eq } from "drizzle-orm";
import { aiActionDrafts, businessBrainEvents, products, recommendations } from "../drizzle/schema.ts";
import { invokeLLM, type Message } from "./_core/llm.ts";
import { getDb, getGrowthProfile, getPrimaryStoreForUser } from "./db.ts";
import { isDraftCapableRecommendationCategory } from "./recommendationEngine.ts";

type DraftPayload = { descriptionHtml?: string; seoTitle?: string; seoDescription?: string; notes?: string[]; positioning?: string; homepageHeadline?: string; proofPoints?: string[]; missingEvidence?: string[]; evidenceUsed?: string[]; estimatedImpact?: { level: "low" | "medium" | "high" | "unknown"; rationale: string } };

function parseDraft(value: string): DraftPayload | null {
  try {
    const parsed = JSON.parse(value) as DraftPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function extractStructuredDraftText(content: unknown) {
  const raw = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map(part => typeof part === "object" && part !== null && "type" in part && (part as { type?: unknown }).type === "text" && "text" in part ? String((part as { text?: unknown }).text || "") : "").join("\n")
      : "";
  return raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export function parseStructuredDraft(content: unknown, errorMessage: string) {
  const text = extractStructuredDraftText(content);
  if (!text) throw new Error(errorMessage);
  const draft = parseDraft(text);
  if (!draft) throw new Error(errorMessage);
  return draft;
}

export function buildMerchantAiMessages(action: "product_description" | "positioning", evidence: unknown): Message[] {
  const actionLabel = action === "product_description" ? "product-content" : "brand-positioning";
  return [
    {
      role: "system",
      content: `You create cautious ecommerce ${actionLabel} drafts for Cresna. Use only facts in the supplied evidence. Do not invent market claims, customer research, comparisons, awards, proof, testimonials, materials, certifications, dimensions, availability, outcomes, reviews, or guarantees. If essential context is missing, identify it in missingEvidence or notes rather than guessing. The output is a private review draft, never a claim of market truth. evidenceUsed must name only supplied source fields that actually shaped the draft. estimatedImpact must use level \"unknown\" unless the supplied evidence includes measured outcomes; never invent a numeric revenue forecast. Explain the estimate or unknown state in rationale. Preserve approved brand voice when supplied.`,
    },
    { role: "user", content: JSON.stringify(evidence) },
  ];
}

export function buildMerchantAiFallback(action: "product_description" | "positioning", evidence: Record<string, unknown>): DraftPayload {
  const sourceFields = action === "product_description"
    ? ["product.title", "product.vendor", "product.productType", "product.currentDescription", "businessBrain.brandVoice", "businessBrain.positioning"]
    : ["businessBrain.brandSummary", "businessBrain.targetCustomer", "businessBrain.brandVoice", "businessBrain.currentPositioning", "businessBrain.differentiators"];
  const evidenceUsed = sourceFields.filter(field => {
    const [group, key] = field.split(".");
    const value = (evidence[group] as Record<string, unknown> | undefined)?.[key];
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
  const nextStep = action === "product_description"
    ? "Retry after the AI provider is available; Cresna has not published or changed your Shopify store."
    : "Retry after the AI provider is available; review your Business Brain before accepting a positioning direction.";
  return action === "product_description"
    ? { descriptionHtml: "", seoTitle: "", seoDescription: "", notes: [`Cresna could not complete this draft. ${nextStep}`], evidenceUsed, estimatedImpact: { level: "unknown", rationale: "No generated draft or measured outcome evidence is available." } }
    : { positioning: "", homepageHeadline: "", proofPoints: [], missingEvidence: [`Cresna could not complete this draft. ${nextStep}`], evidenceUsed, estimatedImpact: { level: "unknown", rationale: "No generated draft or measured outcome evidence is available." } };
}

export function buildLinkedDraftMetadata(recommendation?: { id: number; category: string }) {
  if (!recommendation) return { recommendationId: null, eventPayload: {} };
  if (!isDraftCapableRecommendationCategory(recommendation.category)) throw new Error("This opportunity needs an operational merchant action, not a product-content AI draft");
  return { recommendationId: recommendation.id, eventPayload: { recommendationId: recommendation.id, recommendationCategory: recommendation.category } };
}

export async function generateProductDescriptionDraft(input: { userId: number; productId: number; recommendationId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const store = await getPrimaryStoreForUser(input.userId);
  if (!store) throw new Error("Connect a Shopify store before generating an AI action");
  const [product, profile] = await Promise.all([
    db.select().from(products).where(and(eq(products.id, input.productId), eq(products.storeId, store.id))).limit(1).then(rows => rows[0]),
    getGrowthProfile(input.userId),
  ]);
  if (!product) throw new Error("Product not found in the connected store");
  let linkedDraft = buildLinkedDraftMetadata();
  if (input.recommendationId) {
    const recommendation = (await db.select().from(recommendations).where(and(eq(recommendations.id, input.recommendationId), eq(recommendations.storeId, store.id))).limit(1))[0];
    if (!recommendation) throw new Error("Opportunity not found");
    linkedDraft = buildLinkedDraftMetadata(recommendation);
  }
  const evidence = {
    product: {
      title: product.title,
      vendor: product.vendor,
      productType: product.productType,
      currentDescription: product.descriptionHtml || "",
      currentSeoTitle: product.seoTitle || "",
      currentSeoDescription: product.seoDescription || "",
      mediaCount: product.mediaCount || 0,
    },
    businessBrain: {
      brandSummary: profile?.brandSummary || "",
      targetCustomer: profile?.targetCustomer || "",
      brandVoice: profile?.brandVoice || "",
      brandValues: profile?.brandValues || "",
      positioning: profile?.positioning || "",
      differentiators: profile?.differentiators || "",
    },
  };
  let draft: DraftPayload;
  try {
    const result = await invokeLLM({
      model: "gpt-5-mini",
      max_tokens: 1800,
      messages: buildMerchantAiMessages("product_description", evidence),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "cresna_product_description_draft",
        strict: true,
        schema: {
          type: "object",
          properties: {
            descriptionHtml: { type: "string" },
            seoTitle: { type: "string" },
            seoDescription: { type: "string" },
            notes: { type: "array", items: { type: "string" }, maxItems: 5 },
            evidenceUsed: { type: "array", items: { type: "string" }, maxItems: 8 },
            estimatedImpact: {
              type: "object",
              properties: {
                level: { type: "string", enum: ["low", "medium", "high", "unknown"] },
                rationale: { type: "string" },
              },
              required: ["level", "rationale"],
              additionalProperties: false,
            },
          },
          required: ["descriptionHtml", "seoTitle", "seoDescription", "notes", "evidenceUsed", "estimatedImpact"],
          additionalProperties: false,
        },
      },
    },
    });
    draft = parseStructuredDraft(result.choices[0]?.message.content, "Cresna could not create a structured AI draft");
  } catch {
    draft = buildMerchantAiFallback("product_description", evidence);
  }
  const inserted = await db.insert(aiActionDrafts).values({
    storeId: store.id,
    recommendationId: linkedDraft.recommendationId,
    productId: product.id,
    actionType: "product_description",
    originalContent: product.descriptionHtml || "",
    generatedContent: JSON.stringify(draft),
    inputEvidenceJson: JSON.stringify(evidence),
  });
  const draftId = Number(inserted[0].insertId);
  await db.insert(businessBrainEvents).values({ storeId: store.id, eventType: "draft_generated", entityType: "ai_action_draft", entityId: draftId, payloadJson: JSON.stringify({ productId: product.id, actionType: "product_description", ...linkedDraft.eventPayload }) });
  return { id: draftId, draft };
}

export async function generatePositioningDraft(input: { userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const store = await getPrimaryStoreForUser(input.userId);
  if (!store) throw new Error("Connect a Shopify store before generating an AI action");
  const profile = await getGrowthProfile(input.userId);
  if (!profile || ![profile.brandSummary, profile.targetCustomer, profile.positioning, profile.differentiators].some(value => Boolean(value?.trim()))) throw new Error("Add brand context in your Business Brain before creating a positioning draft");
  const evidence = {
    businessBrain: {
      brandSummary: profile.brandSummary || "",
      targetCustomer: profile.targetCustomer || "",
      brandVoice: profile.brandVoice || "",
      brandValues: profile.brandValues || "",
      currentPositioning: profile.positioning || "",
      differentiators: profile.differentiators || "",
    },
  };
  let draft: DraftPayload;
  try {
    const result = await invokeLLM({
      model: "gpt-5-mini",
      max_tokens: 1300,
      messages: buildMerchantAiMessages("positioning", evidence),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "cresna_positioning_draft",
        strict: true,
        schema: {
          type: "object",
          properties: {
            positioning: { type: "string" },
            homepageHeadline: { type: "string" },
            proofPoints: { type: "array", items: { type: "string" }, maxItems: 4 },
            missingEvidence: { type: "array", items: { type: "string" }, maxItems: 5 },
            evidenceUsed: { type: "array", items: { type: "string" }, maxItems: 8 },
            estimatedImpact: {
              type: "object",
              properties: {
                level: { type: "string", enum: ["low", "medium", "high", "unknown"] },
                rationale: { type: "string" },
              },
              required: ["level", "rationale"],
              additionalProperties: false,
            },
          },
          required: ["positioning", "homepageHeadline", "proofPoints", "missingEvidence", "evidenceUsed", "estimatedImpact"],
          additionalProperties: false,
        },
      },
    },
    });
    draft = parseStructuredDraft(result.choices[0]?.message.content, "Cresna could not create a structured positioning draft");
  } catch {
    draft = buildMerchantAiFallback("positioning", evidence);
  }
  const inserted = await db.insert(aiActionDrafts).values({ storeId: store.id, actionType: "positioning", originalContent: profile.positioning || "", generatedContent: JSON.stringify(draft), inputEvidenceJson: JSON.stringify(evidence) });
  const draftId = Number(inserted[0].insertId);
  await db.insert(businessBrainEvents).values({ storeId: store.id, eventType: "draft_generated", entityType: "ai_action_draft", entityId: draftId, payloadJson: JSON.stringify({ actionType: "positioning" }) });
  return { id: draftId, draft };
}

export async function listAiActionDraftsForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const store = await getPrimaryStoreForUser(userId);
  if (!store) return [];
  const rows = await db.select({ draft: aiActionDrafts, product: products, recommendation: recommendations })
    .from(aiActionDrafts)
    .leftJoin(products, eq(aiActionDrafts.productId, products.id))
    .leftJoin(recommendations, eq(aiActionDrafts.recommendationId, recommendations.id))
    .where(eq(aiActionDrafts.storeId, store.id))
    .orderBy(desc(aiActionDrafts.createdAt));
  return rows.map(row => ({ ...row, parsedDraft: parseDraft(row.draft.generatedContent) }));
}

export async function updateAiActionDraftStatus(input: { userId: number; draftId: number; status: "approved" | "rejected" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const store = await getPrimaryStoreForUser(input.userId);
  if (!store) throw new Error("Connect a Shopify store first");
  const draft = (await db.select().from(aiActionDrafts).where(and(eq(aiActionDrafts.id, input.draftId), eq(aiActionDrafts.storeId, store.id))).limit(1))[0];
  if (!draft) throw new Error("AI draft not found");
  if (draft.status !== "generated") throw new Error("This AI draft has already been reviewed");
  await db.update(aiActionDrafts).set({ status: input.status, approvedAt: input.status === "approved" ? new Date() : null }).where(eq(aiActionDrafts.id, draft.id));
  await db.insert(businessBrainEvents).values({ storeId: store.id, eventType: input.status === "approved" ? "draft_approved" : "draft_rejected", entityType: "ai_action_draft", entityId: draft.id, payloadJson: JSON.stringify({ productId: draft.productId, actionType: draft.actionType }) });
  return { status: input.status };
}
