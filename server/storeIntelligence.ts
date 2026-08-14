import { desc, eq } from "drizzle-orm";
import {
  businessBrainEvents,
  collections,
  growthScoreSnapshots,
  merchantGrowthProfiles,
  products,
  storeDailyMetrics,
  storeScanSnapshots,
  stores,
} from "../drizzle/schema";
import { getDb, getPrimaryStoreForUser } from "./db";

type ScoreComponent = {
  key: "catalog_clarity" | "commerce_health" | "offer_readiness" | "brand_context";
  label: string;
  score: number | null;
  available: boolean;
  explanation: string;
};

function plainText(value: string | null | undefined) {
  return (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateGrowthScore(input: {
  products: Array<{ status: string; descriptionHtml: string | null; seoTitle: string | null; seoDescription: string | null; mediaCount: number | null; totalInventory: number | null }>;
  collections: Array<{ descriptionHtml: string | null; seoTitle: string | null; seoDescription: string | null; productCount: number }>;
  dailyMetrics: Array<{ orderCount: number; refundCount: number; checkoutCount: number; abandonedCheckoutCount: number }>;
  profile?: { goalsJson: string; brandSummary: string | null; targetCustomer: string | null; brandVoice: string | null; brandValues: string | null; positioning: string | null; differentiators: string | null } | undefined;
}) {
  const activeProducts = input.products.filter(product => product.status === "ACTIVE");
  const catalogAvailable = activeProducts.length > 0;
  const descriptionCoverage = catalogAvailable ? activeProducts.filter(product => plainText(product.descriptionHtml).length >= 80).length / activeProducts.length : 0;
  const seoCoverage = catalogAvailable ? activeProducts.filter(product => Boolean(product.seoTitle?.trim()) && Boolean(product.seoDescription?.trim())).length / activeProducts.length : 0;
  const mediaCoverage = catalogAvailable ? activeProducts.filter(product => (product.mediaCount || 0) > 0).length / activeProducts.length : 0;
  const catalogScore = catalogAvailable ? clamp((descriptionCoverage * 0.45 + seoCoverage * 0.35 + mediaCoverage * 0.2) * 100) : null;

  const commerceAvailable = input.dailyMetrics.length >= 7;
  const orders = input.dailyMetrics.reduce((sum, row) => sum + row.orderCount, 0);
  const refunds = input.dailyMetrics.reduce((sum, row) => sum + row.refundCount, 0);
  const checkouts = input.dailyMetrics.reduce((sum, row) => sum + row.checkoutCount, 0);
  const abandoned = input.dailyMetrics.reduce((sum, row) => sum + row.abandonedCheckoutCount, 0);
  const refundRate = orders ? refunds / orders : 0;
  const abandonmentRate = checkouts ? abandoned / checkouts : 0;
  const commerceScore = commerceAvailable ? clamp(100 - Math.min(45, refundRate * 220) - Math.min(35, abandonmentRate * 80)) : null;

  const offerAvailable = input.products.length > 0;
  const inventoryCoverage = offerAvailable ? input.products.filter(product => product.totalInventory !== null).length / input.products.length : 0;
  const collectionCoverage = input.collections.length ? input.collections.filter(collection => plainText(collection.descriptionHtml).length >= 60 || Boolean(collection.seoTitle?.trim()) || Boolean(collection.seoDescription?.trim())).length / input.collections.length : 0;
  const offerScore = offerAvailable ? clamp(60 + inventoryCoverage * 20 + (input.collections.length ? collectionCoverage * 20 : 0)) : null;

  const profileFields = input.profile
    ? [
        (() => { try { return JSON.parse(input.profile!.goalsJson) as string[]; } catch { return []; } })().length > 0,
        Boolean(input.profile.brandSummary?.trim()),
        Boolean(input.profile.targetCustomer?.trim()),
        Boolean(input.profile.brandVoice?.trim()),
        Boolean(input.profile.positioning?.trim()),
        Boolean(input.profile.differentiators?.trim() || input.profile.brandValues?.trim()),
      ]
    : [];
  const brandAvailable = profileFields.length > 0;
  const brandScore = brandAvailable ? clamp((profileFields.filter(Boolean).length / profileFields.length) * 100) : null;

  const components: ScoreComponent[] = [
    {
      key: "catalog_clarity",
      label: "Catalog clarity",
      score: catalogScore,
      available: catalogAvailable,
      explanation: catalogAvailable
        ? `${Math.round(descriptionCoverage * 100)}% of active products have substantial descriptions; ${Math.round(seoCoverage * 100)}% have both SEO title and description; ${Math.round(mediaCoverage * 100)}% include product media.`
        : "No active product records are available yet.",
    },
    {
      key: "commerce_health",
      label: "Commerce health",
      score: commerceScore,
      available: commerceAvailable,
      explanation: commerceAvailable
        ? `Based on ${input.dailyMetrics.length} reporting days. Refund rate: ${Math.round(refundRate * 100)}%. Recorded checkout abandonment: ${Math.round(abandonmentRate * 100)}%.`
        : "At least seven reporting days are required before Cresna evaluates commerce health.",
    },
    {
      key: "offer_readiness",
      label: "Offer readiness",
      score: offerScore,
      available: offerAvailable,
      explanation: offerAvailable
        ? `${Math.round(inventoryCoverage * 100)}% of products include inventory data. ${input.collections.length ? `${Math.round(collectionCoverage * 100)}% of ${input.collections.length} collections include descriptive or SEO content.` : "No collection records are available yet."}`
        : "No product catalog is available yet.",
    },
    {
      key: "brand_context",
      label: "Brand context",
      score: brandScore,
      available: brandAvailable,
      explanation: brandAvailable
        ? `${profileFields.filter(Boolean).length} of ${profileFields.length} Business Brain fields are complete. Cresna uses only completed context in AI drafts.`
        : "Complete the Growth Profile before Cresna can preserve your brand context.",
    },
  ];
  const available = components.filter(component => component.available && component.score !== null);
  const coveragePercent = clamp((available.length / components.length) * 100);
  const overallScore = available.length >= 2 ? clamp(available.reduce((sum, component) => sum + (component.score || 0), 0) / available.length) : null;
  const status: "ready" | "partial" | "needs_more_data" = available.length < 2 ? "needs_more_data" : available.length === components.length ? "ready" : "partial";
  return { overallScore, coveragePercent, status, components };
}

export async function refreshStoreIntelligence(storeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const store = (await db.select().from(stores).where(eq(stores.id, storeId)).limit(1))[0];
  if (!store) throw new Error("Connected store not found");
  const [profile, productRows, collectionRows, dailyMetrics] = await Promise.all([
    db.select().from(merchantGrowthProfiles).where(eq(merchantGrowthProfiles.userId, store.userId)).limit(1).then(rows => rows[0]),
    db.select().from(products).where(eq(products.storeId, store.id)),
    db.select().from(collections).where(eq(collections.storeId, store.id)),
    db.select().from(storeDailyMetrics).where(eq(storeDailyMetrics.storeId, store.id)).orderBy(desc(storeDailyMetrics.metricDate)).limit(60),
  ]);
  const score = calculateGrowthScore({ products: productRows, collections: collectionRows, dailyMetrics, profile });
  const sourceCoverage = {
    products: productRows.length > 0 ? "available" : "unavailable",
    collections: collectionRows.length > 0 ? "available" : "unavailable",
    sales: dailyMetrics.length >= 7 ? "available" : "needs_more_data",
    checkout: dailyMetrics.some(metric => metric.checkoutCount > 0) ? "available" : "unavailable",
    brandContext: score.components.find(component => component.key === "brand_context")?.available ? "available" : "needs_more_data",
    externalCompetitors: "unavailable",
    AIVisibility: "unavailable",
  };
  const scanStatus = score.status === "needs_more_data" ? "needs_more_data" : "ready";
  const summary = `Cresna scanned ${productRows.length} products, ${collectionRows.length} collections, and ${dailyMetrics.length} reporting days. External competitors and AI-search visibility are not included until a verifiable source is connected.`;
  await db.insert(storeScanSnapshots).values({ storeId: store.id, status: scanStatus, coveragePercent: score.coveragePercent, sourceCoverageJson: JSON.stringify(sourceCoverage), summary });
  await db.insert(growthScoreSnapshots).values({ storeId: store.id, overallScore: score.overallScore, coveragePercent: score.coveragePercent, status: score.status, componentsJson: JSON.stringify(score.components), calculationVersion: "v1" });
  await db.insert(businessBrainEvents).values({ storeId: store.id, eventType: "scan_completed", entityType: "store", entityId: store.id, payloadJson: JSON.stringify({ coveragePercent: score.coveragePercent, scoreStatus: score.status }) });
  return { scan: { status: scanStatus, coveragePercent: score.coveragePercent, summary, sourceCoverage }, score };
}

export async function getStoreIntelligenceForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const store = await getPrimaryStoreForUser(userId);
  if (!store) return { store: null, profile: await db.select().from(merchantGrowthProfiles).where(eq(merchantGrowthProfiles.userId, userId)).limit(1).then(rows => rows[0] || null), scan: null, score: null, events: [] };
  const [profile, scan, score, events] = await Promise.all([
    db.select().from(merchantGrowthProfiles).where(eq(merchantGrowthProfiles.userId, userId)).limit(1).then(rows => rows[0] || null),
    db.select().from(storeScanSnapshots).where(eq(storeScanSnapshots.storeId, store.id)).orderBy(desc(storeScanSnapshots.scannedAt)).limit(1).then(rows => rows[0] || null),
    db.select().from(growthScoreSnapshots).where(eq(growthScoreSnapshots.storeId, store.id)).orderBy(desc(growthScoreSnapshots.calculatedAt)).limit(1).then(rows => rows[0] || null),
    db.select().from(businessBrainEvents).where(eq(businessBrainEvents.storeId, store.id)).orderBy(desc(businessBrainEvents.createdAt)).limit(20),
  ]);
  return { store, profile, scan, score, events };
}
