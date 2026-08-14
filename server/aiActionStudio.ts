import { and, desc, eq } from "drizzle-orm";
import { aiActionDrafts, businessBrainEvents, products, recommendations } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { getDb, getGrowthProfile, getPrimaryStoreForUser } from "./db";
import { isDraftCapableRecommendationCategory } from "./recommendationEngine";

type DraftPayload = { descriptionHtml?: string; seoTitle?: string; seoDescription?: string; notes?: string[]; positioning?: string; homepageHeadline?: string; proofPoints?: string[]; missingEvidence?: string[]; evidenceUsed?: string[] };

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
  const result = await invokeLLM({
    model: "gpt-5-mini",
    max_tokens: 1800,
    messages: [
      { role: "system", content: "You create safe ecommerce product-content drafts for Cresna. Use only facts in the supplied product and Business Brain. Preserve the approved voice when supplied. Do not invent materials, certifications, dimensions, availability, outcomes, reviews, comparisons, or guarantees. Return reviewable concise HTML only for descriptionHtml using p, h3, and ul tags. Notes must explicitly identify any important missing product facts rather than guessing. evidenceUsed must name only supplied source fields that actually shaped the draft, such as product.title, product.vendor, product.productType, product.currentDescription, businessBrain.brandVoice, or businessBrain.positioning." },
      { role: "user", content: JSON.stringify(evidence) },
    ],
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
          },
          required: ["descriptionHtml", "seoTitle", "seoDescription", "notes", "evidenceUsed"],
          additionalProperties: false,
        },
      },
    },
  });
  const draft = parseStructuredDraft(result.choices[0]?.message.content, "Cresna could not create a structured AI draft");
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
  const result = await invokeLLM({
    model: "gpt-5-mini",
    max_tokens: 1300,
    messages: [
      { role: "system", content: "You create cautious brand-positioning drafts for Cresna. Use only the approved Business Brain fields. Do not invent market claims, customer research, comparisons, awards, proof, testimonials, performance, or benefits not supplied by the merchant. If essential context is missing, name it in missingEvidence instead of guessing. The output is a private review draft, never a claim of market truth. evidenceUsed must name only the approved Business Brain fields that shaped the draft." },
      { role: "user", content: JSON.stringify(evidence) },
    ],
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
          },
          required: ["positioning", "homepageHeadline", "proofPoints", "missingEvidence", "evidenceUsed"],
          additionalProperties: false,
        },
      },
    },
  });
  const draft = parseStructuredDraft(result.choices[0]?.message.content, "Cresna could not create a structured positioning draft");
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
