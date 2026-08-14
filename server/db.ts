import { and, desc, eq, gt, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  aiActionDrafts,
  billingAccounts,
  betaFeatureOverrides,
  betaFeedback,
  foundingBetaInvites,
  merchantGrowthProfiles,
  products,
  productDailyMetrics,
  recommendationActions,
  recommendations,
  shopifyOauthStates,
  storeDailyMetrics,
  stores,
  users,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { isPermanentOwner } from "./accessRules";
import { BetaFeedbackInput, toBetaFeedbackPersistenceValues } from "./betaFeedback";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (isPermanentOwner(user.openId, ENV.ownerOpenId)) {
      values.role = 'admin';
      updateSet.role = 'admin';
    } else if (user.role !== undefined) {
      values.role = user.role === "admin" ? "user" : user.role;
      updateSet.role = values.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getWorkspaceProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
}

export async function updateWorkspaceName(userId: number, workspaceName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ workspaceName: workspaceName || null }).where(eq(users.id, userId));
  return getWorkspaceProfile(userId);
}

export async function getGrowthProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(merchantGrowthProfiles).where(eq(merchantGrowthProfiles.userId, userId)).limit(1))[0];
}

export async function updateGrowthProfile(input: {
  userId: number;
  goals: string[];
  brandSummary?: string | null;
  targetCustomer?: string | null;
  brandVoice?: string | null;
  brandValues?: string | null;
  positioning?: string | null;
  differentiators?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = {
    userId: input.userId,
    goalsJson: JSON.stringify(Array.from(new Set(input.goals))),
    brandSummary: input.brandSummary?.trim() || null,
    targetCustomer: input.targetCustomer?.trim() || null,
    brandVoice: input.brandVoice?.trim() || null,
    brandValues: input.brandValues?.trim() || null,
    positioning: input.positioning?.trim() || null,
    differentiators: input.differentiators?.trim() || null,
  };
  await db.insert(merchantGrowthProfiles).values(values).onDuplicateKeyUpdate({
    set: {
      goalsJson: values.goalsJson,
      brandSummary: values.brandSummary,
      targetCustomer: values.targetCustomer,
      brandVoice: values.brandVoice,
      brandValues: values.brandValues,
      positioning: values.positioning,
      differentiators: values.differentiators,
    },
  });
  return getGrowthProfile(input.userId);
}

export async function setGrowthProfileScanStatus(userId: number, scanStatus: "not_started" | "ready" | "needs_more_data") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await getGrowthProfile(userId);
  if (!existing) {
    await db.insert(merchantGrowthProfiles).values({ userId, goalsJson: "[]", scanStatus, lastScannedAt: new Date() });
  } else {
    await db.update(merchantGrowthProfiles).set({ scanStatus, lastScannedAt: new Date() }).where(eq(merchantGrowthProfiles.userId, userId));
  }
}

export async function activateEligibleBetaForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const user = await getWorkspaceProfile(userId);
  if (!user?.email) return null;
  const invite = (await db.select().from(foundingBetaInvites).where(eq(foundingBetaInvites.email, user.email.toLowerCase())).limit(1))[0];
  if (!invite || invite.status === "revoked") return null;
  const now = new Date();
  if (invite.status === "active" && invite.expiresAt && invite.expiresAt <= now) {
    await db.update(foundingBetaInvites).set({ status: "expired" }).where(eq(foundingBetaInvites.id, invite.id));
    return null;
  }
  if (invite.status === "expired") return null;
  if (invite.status === "invited") {
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await db.update(foundingBetaInvites).set({ status: "active", activatedUserId: userId, activatedAt: now, expiresAt }).where(eq(foundingBetaInvites.id, invite.id));
    return { ...invite, status: "active" as const, activatedUserId: userId, activatedAt: now, expiresAt };
  }
  return invite;
}

export async function getBetaInviteForUser(userId: number) {
  return activateEligibleBetaForUser(userId);
}

export async function createFoundingBetaInvite(ownerUserId: number, email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalizedEmail = email.trim().toLowerCase();
  await db.insert(foundingBetaInvites).values({ email: normalizedEmail, invitedByUserId: ownerUserId }).onDuplicateKeyUpdate({
    set: { status: "invited", activatedUserId: null, activatedAt: null, expiresAt: null, deliveryStatus: "pending", deliveryMessageId: null, deliveryError: null, deliveredAt: null },
  });
  return (await db.select().from(foundingBetaInvites).where(eq(foundingBetaInvites.email, normalizedEmail)).limit(1))[0];
}

export async function setFoundingBetaInviteDelivery(input: { inviteId: number; status: "sent" | "failed" | "unconfigured"; messageId?: string | null; error?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(foundingBetaInvites).set({
    deliveryStatus: input.status,
    deliveryMessageId: input.messageId || null,
    deliveryError: input.error || null,
    deliveredAt: input.status === "sent" ? new Date() : null,
  }).where(eq(foundingBetaInvites.id, input.inviteId));
}

export async function listFoundingBetaInvites() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(foundingBetaInvites).orderBy(desc(foundingBetaInvites.createdAt));
}

export async function setBetaFeatureOverride(betaInviteId: number, featureKey: string, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(betaFeatureOverrides).values({ betaInviteId, featureKey, enabled: enabled ? 1 : 0 }).onDuplicateKeyUpdate({ set: { enabled: enabled ? 1 : 0 } });
}

export async function getBetaFeatureOverrides(betaInviteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(betaFeatureOverrides).where(eq(betaFeatureOverrides.betaInviteId, betaInviteId));
}

export async function isBetaFeatureEnabledForUser(userId: number, featureKey: string) {
  const invite = await activateEligibleBetaForUser(userId);
  if (!invite || invite.status !== "active") return true;
  const overrides = await getBetaFeatureOverrides(invite.id);
  const override = overrides.find(item => item.featureKey === featureKey);
  return override ? override.enabled === 1 : true;
}

export async function saveBetaFeedback(input: BetaFeedbackInput & { userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const invite = await activateEligibleBetaForUser(input.userId);
  if (!invite || invite.status !== "active") throw new Error("An active Founding Beta invitation is required to submit feedback");
  const values = toBetaFeedbackPersistenceValues(input, invite.id);
  await db.insert(betaFeedback).values(values).onDuplicateKeyUpdate({ set: { growthProfileRating: values.growthProfileRating, mostUsefulRecommendation: values.mostUsefulRecommendation, willingnessToPay: values.willingnessToPay, feedbackText: values.feedbackText } });
  return invite;
}

export async function listBetaFeedback() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(betaFeedback).orderBy(desc(betaFeedback.createdAt));
}

export async function getBetaFeedbackForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const invite = await activateEligibleBetaForUser(userId);
  if (!invite) return { invite: null, feedback: [] };
  const feedback = await db.select().from(betaFeedback).where(eq(betaFeedback.betaInviteId, invite.id)).orderBy(desc(betaFeedback.createdAt));
  return { invite, feedback };
}

export async function getOwnerOverview() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [allUsers, allStores, invites, feedback, allRecommendations, allDrafts, outcomeActions, stripeAccounts] = await Promise.all([
    db.select({ id: users.id }).from(users),
    db.select({ id: stores.id, connectionStatus: stores.connectionStatus }).from(stores),
    db.select().from(foundingBetaInvites).orderBy(desc(foundingBetaInvites.createdAt)),
    db.select().from(betaFeedback).orderBy(desc(betaFeedback.createdAt)),
    db.select({ id: recommendations.id, status: recommendations.status }).from(recommendations),
    db.select({ id: aiActionDrafts.id, status: aiActionDrafts.status }).from(aiActionDrafts),
    db.select({ id: recommendationActions.id, measurementStatus: recommendationActions.measurementStatus, revenueChange: recommendationActions.revenueChange }).from(recommendationActions),
    db.select({ id: billingAccounts.id }).from(billingAccounts),
  ]);
  const betaInvites = await Promise.all(invites.map(async invite => ({ ...invite, featureOverrides: await getBetaFeatureOverrides(invite.id) })));
  const ratedFeedback = feedback.filter(item => item.growthProfileRating !== null);
  const betaFeedbackSummary = {
    totalSubmissions: feedback.length,
    ratingCount: ratedFeedback.length,
    averageGrowthProfileRating: ratedFeedback.length ? Math.round((ratedFeedback.reduce((sum, item) => sum + Number(item.growthProfileRating), 0) / ratedFeedback.length) * 10) / 10 : null,
    writtenResponseCount: feedback.filter(item => Boolean(item.feedbackText?.trim())).length,
    checkpoints: feedback.reduce<Record<string, number>>((counts, item) => { counts[item.checkpoint] = (counts[item.checkpoint] || 0) + 1; return counts; }, {}),
    willingnessToPay: feedback.reduce<Record<string, number>>((counts, item) => { if (item.willingnessToPay) counts[item.willingnessToPay] = (counts[item.willingnessToPay] || 0) + 1; return counts; }, {}),
  };
  return {
    totalUsers: allUsers.length,
    connectedStores: allStores.filter(store => store.connectionStatus === "connected").length,
    stripeLinkedWorkspaces: stripeAccounts.length,
    recommendationsGenerated: allRecommendations.length,
    recommendationsCompleted: allRecommendations.filter(recommendation => recommendation.status === "completed").length,
    aiDraftsGenerated: allDrafts.length,
    aiDraftsApproved: allDrafts.filter(draft => draft.status === "approved").length,
    outcomesMeasured: outcomeActions.filter(action => action.measurementStatus === "measured").length,
    positiveOutcomes: outcomeActions.filter(action => action.measurementStatus === "measured" && Number(action.revenueChange ?? 0) > 0).length,
    betaInvites,
    betaFeedback: feedback,
    betaFeedbackSummary,
  };
}

export async function listStripeCustomerReferences() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ userId: users.id, stripeCustomerId: users.stripeCustomerId }).from(users);
  return rows.filter((row): row is { userId: number; stripeCustomerId: string } => Boolean(row.stripeCustomerId));
}

/**
 * Cross-workspace outcome patterns are deliberately aggregated by recommendation
 * category. Samples below the threshold are discarded so no merchant-level
 * result can be reconstructed or over-interpreted.
 */
export async function getAggregateOutcomeLearningSignals(minimumMeasuredSamples = 5) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({
      category: recommendations.category,
      measurementStatus: recommendationActions.measurementStatus,
      revenueChange: recommendationActions.revenueChange,
    })
    .from(recommendationActions)
    .innerJoin(recommendations, eq(recommendationActions.recommendationId, recommendations.id));

  const grouped = new Map<string, number[]>();
  for (const row of rows) {
    if (row.measurementStatus !== "measured" || row.revenueChange === null) continue;
    const results = grouped.get(row.category) || [];
    results.push(Number(row.revenueChange));
    grouped.set(row.category, results);
  }

  return Array.from(grouped.entries())
    .filter(([, revenueChanges]) => revenueChanges.length >= minimumMeasuredSamples)
    .map(([category, revenueChanges]) => ({
      category,
      measuredSampleCount: revenueChanges.length,
      positiveOutcomeRate: Math.round((revenueChanges.filter(change => change > 0).length / revenueChanges.length) * 100),
      averageRevenueChange: Math.round(revenueChanges.reduce((sum, change) => sum + change, 0) / revenueChanges.length),
    }))
    .sort((left, right) => right.measuredSampleCount - left.measuredSampleCount || right.positiveOutcomeRate - left.positiveOutcomeRate);
}

export async function getPrimaryStoreForUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(stores).where(eq(stores.userId, userId)).limit(1))[0];
}

export async function getAnalyticsOverview(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const store = await getPrimaryStoreForUser(userId);
  if (!store) return { store: null, dailyMetrics: [], productMetrics: [] };

  const [dailyMetrics, productMetrics] = await Promise.all([
    db.select().from(storeDailyMetrics).where(eq(storeDailyMetrics.storeId, store.id)).orderBy(desc(storeDailyMetrics.metricDate)).limit(60),
    db.select().from(productDailyMetrics).where(eq(productDailyMetrics.storeId, store.id)).orderBy(desc(productDailyMetrics.metricDate)).limit(200),
  ]);

  return { store, dailyMetrics: dailyMetrics.reverse(), productMetrics };
}

export async function getCatalogProductsForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const store = await getPrimaryStoreForUser(userId);
  if (!store) return [];
  return db.select().from(products).where(eq(products.storeId, store.id)).orderBy(products.title);
}

export async function getMonthlyAiActionDraftCount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const store = await getPrimaryStoreForUser(userId);
  if (!store) return 0;
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const rows = await db.select({ id: aiActionDrafts.id }).from(aiActionDrafts).where(and(eq(aiActionDrafts.storeId, store.id), gte(aiActionDrafts.createdAt, startOfMonth)));
  return rows.length;
}

export async function getRecommendationsForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const store = await getPrimaryStoreForUser(userId);
  if (!store) return [];
  return db.select().from(recommendations).where(eq(recommendations.storeId, store.id)).orderBy(recommendations.priorityRank);
}

export async function getRecommendationActionsForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const store = await getPrimaryStoreForUser(userId);
  if (!store) return [];
  const rows = await db
    .select({ action: recommendationActions, recommendation: recommendations })
    .from(recommendationActions)
    .innerJoin(recommendations, eq(recommendationActions.recommendationId, recommendations.id))
    .where(eq(recommendations.storeId, store.id))
    .orderBy(desc(recommendationActions.actedAt));
  return rows;
}

export async function createShopifyOAuthState(userId: number, shopDomain: string, stateHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(shopifyOauthStates).values({ userId, shopDomain, stateHash, expiresAt });
}

export async function consumeShopifyOAuthState(stateHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const state = (await db.select().from(shopifyOauthStates).where(and(eq(shopifyOauthStates.stateHash, stateHash), gt(shopifyOauthStates.expiresAt, new Date()))).limit(1))[0];
  if (state) await db.delete(shopifyOauthStates).where(eq(shopifyOauthStates.id, state.id));
  return state;
}

export async function updateStripeReferences(userId: number, customerId?: string | null, subscriptionId?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (customerId) await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
  if (subscriptionId !== undefined) {
    await db.insert(billingAccounts).values({ userId, stripeSubscriptionId: subscriptionId || null }).onDuplicateKeyUpdate({ set: { stripeSubscriptionId: subscriptionId || null } });
  }
}
