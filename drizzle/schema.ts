import {
  bigint,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  workspaceName: varchar("workspaceName", { length: 120 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Merchant-provided operating context remembered by the Growth Profile. */
export const merchantGrowthProfiles = mysqlTable(
  "merchantGrowthProfiles",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalsJson: text("goalsJson").notNull(),
    brandSummary: text("brandSummary"),
    targetCustomer: text("targetCustomer"),
    brandVoice: varchar("brandVoice", { length: 120 }),
    brandValues: text("brandValues"),
    positioning: text("positioning"),
    differentiators: text("differentiators"),
    scanStatus: mysqlEnum("scanStatus", ["not_started", "ready", "needs_more_data"])
      .default("not_started")
      .notNull(),
    lastScannedAt: timestamp("lastScannedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("merchant_growth_profiles_user_unique").on(table.userId)]
);

/** A seller's connected Shopify store. The access token is stored only as ciphertext. */
/** Owner-managed invitations grant a time-limited Founding Beta workspace without a paid subscription. */
export const foundingBetaInvites = mysqlTable(
  "foundingBetaInvites",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    invitedByUserId: int("invitedByUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["invited", "active", "expired", "revoked"]).default("invited").notNull(),
    activatedUserId: int("activatedUserId").references(() => users.id, { onDelete: "set null" }),
    activatedAt: timestamp("activatedAt"),
    expiresAt: timestamp("expiresAt"),
    deliveryStatus: mysqlEnum("deliveryStatus", ["pending", "sent", "failed", "unconfigured"]).default("pending").notNull(),
    deliveryMessageId: varchar("deliveryMessageId", { length: 255 }),
    deliveryError: text("deliveryError"),
    deliveredAt: timestamp("deliveredAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("founding_beta_invites_status_idx").on(table.status)]
);

/** Public beta access requests never grant product access by themselves. The configured owner reviews each request and can send a separate invitation. */
export const betaAccessRequests = mysqlTable(
  "betaAccessRequests",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    storeUrl: varchar("storeUrl", { length: 255 }),
    note: text("note"),
    status: mysqlEnum("status", ["requested", "invited", "declined"]).default("requested").notNull(),
    invitedByUserId: int("invitedByUserId").references(() => users.id, { onDelete: "set null" }),
    invitedAt: timestamp("invitedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("beta_access_requests_status_idx").on(table.status)]
);

/** One onboarding record per merchant workspace prevents completed or dismissed guidance from reappearing automatically. */
export const userOnboarding = mysqlTable(
  "userOnboarding",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["not_started", "completed", "dismissed"]).default("not_started").notNull(),
    completedAt: timestamp("completedAt"),
    dismissedAt: timestamp("dismissedAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("user_onboarding_user_unique").on(table.userId)]
);

/** The owner can enable narrowly scoped experimental capabilities per beta workspace. */
export const betaFeatureOverrides = mysqlTable(
  "betaFeatureOverrides",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    betaInviteId: bigint("betaInviteId", { mode: "number" })
      .notNull()
      .references(() => foundingBetaInvites.id, { onDelete: "cascade" }),
    featureKey: varchar("featureKey", { length: 80 }).notNull(),
    enabled: int("enabled").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("beta_feature_override_unique").on(table.betaInviteId, table.featureKey)]
);

/** Structured feedback protects beta learnings without creating fake social proof. */
export const betaFeedback = mysqlTable(
  "betaFeedback",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    betaInviteId: bigint("betaInviteId", { mode: "number" })
      .notNull()
      .references(() => foundingBetaInvites.id, { onDelete: "cascade" }),
    checkpoint: mysqlEnum("checkpoint", ["day_1", "day_3", "day_7"]).notNull(),
    growthProfileRating: int("growthProfileRating"),
    mostUsefulRecommendation: text("mostUsefulRecommendation"),
    willingnessToPay: mysqlEnum("willingnessToPay", ["definitely", "probably", "maybe", "no"]),
    feedbackText: text("feedbackText"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("beta_feedback_invite_checkpoint_unique").on(table.betaInviteId, table.checkpoint)]
);

export const stores = mysqlTable(
  "stores",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shopifyShopId: varchar("shopifyShopId", { length: 64 }).notNull().unique(),
    myshopifyDomain: varchar("myshopifyDomain", { length: 255 }).notNull().unique(),
    displayName: varchar("displayName", { length: 255 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    accessTokenCiphertext: text("accessTokenCiphertext").notNull(),
    grantedScopes: text("grantedScopes").notNull(),
    connectionStatus: mysqlEnum("connectionStatus", ["connected", "disconnected", "error"])
      .default("connected")
      .notNull(),
    installedAt: timestamp("installedAt").defaultNow().notNull(),
    lastSyncedAt: timestamp("lastSyncedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("stores_user_idx").on(table.userId)]
);

/** Short-lived, hashed OAuth state records prevent store-connection request forgery. */
export const shopifyOauthStates = mysqlTable(
  "shopifyOauthStates",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shopDomain: varchar("shopDomain", { length: 255 }).notNull(),
    stateHash: varchar("stateHash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("shopify_oauth_states_user_idx").on(table.userId)]
);

/** Current Shopify product metadata, separate from daily performance snapshots. */
export const products = mysqlTable(
  "products",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    storeId: bigint("storeId", { mode: "number" })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    shopifyProductId: varchar("shopifyProductId", { length: 64 }).notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    handle: varchar("handle", { length: 255 }),
    vendor: varchar("vendor", { length: 255 }),
    productType: varchar("productType", { length: 255 }),
    status: varchar("status", { length: 64 }).notNull(),
    totalInventory: int("totalInventory"),
    descriptionHtml: text("descriptionHtml"),
    seoTitle: varchar("seoTitle", { length: 255 }),
    seoDescription: text("seoDescription"),
    mediaCount: int("mediaCount"),
    priceMin: decimal("priceMin", { precision: 14, scale: 2 }),
    priceMax: decimal("priceMax", { precision: 14, scale: 2 }),
    compareAtPriceMin: decimal("compareAtPriceMin", { precision: 14, scale: 2 }),
    compareAtPriceMax: decimal("compareAtPriceMax", { precision: 14, scale: 2 }),
    updatedAtSource: timestamp("updatedAtSource").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("products_store_shopify_product_unique").on(table.storeId, table.shopifyProductId),
    index("products_store_idx").on(table.storeId),
  ]
);

/** Collection metadata gives the scan a real view of catalog organization and collection-page clarity. */
export const collections = mysqlTable(
  "collections",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    storeId: bigint("storeId", { mode: "number" })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    shopifyCollectionId: varchar("shopifyCollectionId", { length: 64 }).notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    handle: varchar("handle", { length: 255 }),
    descriptionHtml: text("descriptionHtml"),
    seoTitle: varchar("seoTitle", { length: 255 }),
    seoDescription: text("seoDescription"),
    productCount: int("productCount").notNull().default(0),
    updatedAtSource: timestamp("updatedAtSource").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("collections_store_shopify_collection_unique").on(table.storeId, table.shopifyCollectionId),
    index("collections_store_idx").on(table.storeId),
  ]
);

/** A scan snapshot explains what Cresna inspected and prevents unavailable sources from appearing as findings. */
export const storeScanSnapshots = mysqlTable(
  "storeScanSnapshots",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    storeId: bigint("storeId", { mode: "number" })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["ready", "needs_more_data", "failed"]).notNull(),
    coveragePercent: int("coveragePercent").notNull(),
    sourceCoverageJson: text("sourceCoverageJson").notNull(),
    summary: text("summary").notNull(),
    scannedAt: timestamp("scannedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("store_scan_snapshots_store_idx").on(table.storeId, table.scannedAt)]
);

/** Component-level scores explain the transparent Growth Score rather than hiding a generic number behind an opaque model. */
export const growthScoreSnapshots = mysqlTable(
  "growthScoreSnapshots",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    storeId: bigint("storeId", { mode: "number" })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    overallScore: int("overallScore"),
    coveragePercent: int("coveragePercent").notNull(),
    status: mysqlEnum("status", ["ready", "partial", "needs_more_data"]).notNull(),
    componentsJson: text("componentsJson").notNull(),
    calculationVersion: varchar("calculationVersion", { length: 32 }).notNull(),
    calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("growth_score_snapshots_store_idx").on(table.storeId, table.calculatedAt)]
);

/** Daily aggregate store measurements. Customer-level personal data is not retained. */
export const storeDailyMetrics = mysqlTable(
  "storeDailyMetrics",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    storeId: bigint("storeId", { mode: "number" })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    metricDate: timestamp("metricDate").notNull(),
    grossRevenue: decimal("grossRevenue", { precision: 14, scale: 2 }).notNull(),
    netRevenue: decimal("netRevenue", { precision: 14, scale: 2 }).notNull(),
    orderCount: int("orderCount").notNull(),
    customerCount: int("customerCount").notNull(),
    checkoutCount: int("checkoutCount").notNull(),
    abandonedCheckoutCount: int("abandonedCheckoutCount").notNull(),
    refundCount: int("refundCount").notNull(),
    refundAmount: decimal("refundAmount", { precision: 14, scale: 2 }).notNull(),
    sourceUpdatedAt: timestamp("sourceUpdatedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("store_daily_metrics_store_date_unique").on(table.storeId, table.metricDate),
    index("store_daily_metrics_store_idx").on(table.storeId),
  ]
);

/** Daily product-level performance inputs used by the evidence-based recommendation engine. */
export const productDailyMetrics = mysqlTable(
  "productDailyMetrics",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    storeId: bigint("storeId", { mode: "number" })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: bigint("productId", { mode: "number" }).references(() => products.id, {
      onDelete: "set null",
    }),
    shopifyProductId: varchar("shopifyProductId", { length: 64 }).notNull(),
    metricDate: timestamp("metricDate").notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    sku: varchar("sku", { length: 255 }),
    unitsSold: int("unitsSold").notNull(),
    orderCount: int("orderCount").notNull(),
    refundCount: int("refundCount").notNull(),
    grossRevenue: decimal("grossRevenue", { precision: 14, scale: 2 }).notNull(),
    discountAmount: decimal("discountAmount", { precision: 14, scale: 2 }).notNull(),
    refundAmount: decimal("refundAmount", { precision: 14, scale: 2 }).notNull(),
    costEstimate: decimal("costEstimate", { precision: 14, scale: 2 }),
    sourceUpdatedAt: timestamp("sourceUpdatedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("product_daily_metrics_product_date_unique").on(
      table.storeId,
      table.shopifyProductId,
      table.metricDate
    ),
    index("product_daily_metrics_store_idx").on(table.storeId),
    index("product_daily_metrics_product_idx").on(table.productId),
  ]
);

/** Ranked, explainable recommendations generated from stored store measurements. */
export const recommendations = mysqlTable(
  "recommendations",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    storeId: bigint("storeId", { mode: "number" })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    category: mysqlEnum("category", [
      "underperforming_sku",
      "high_refunds",
      "abandoned_cart",
      "margin_erosion",
      "restock",
      "product_copy",
      "pricing",
    ]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    rationale: text("rationale").notNull(),
    recommendedAction: text("recommendedAction").notNull(),
    evidence: text("evidence").notNull(),
    estimatedImpactLow: decimal("estimatedImpactLow", { precision: 14, scale: 2 }).notNull(),
    estimatedImpactHigh: decimal("estimatedImpactHigh", { precision: 14, scale: 2 }).notNull(),
    confidencePercent: int("confidencePercent").notNull(),
    priorityRank: int("priorityRank").notNull(),
    status: mysqlEnum("status", ["open", "approved", "in_progress", "completed", "dismissed"])
      .default("open")
      .notNull(),
    effortLevel: mysqlEnum("effortLevel", ["low", "medium", "high"]).default("medium").notNull(),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("recommendations_store_status_idx").on(table.storeId, table.status),
    index("recommendations_store_priority_idx").on(table.storeId, table.priorityRank),
  ]
);

/** AI drafts are reviewable proposed work; no Shopify storefront mutation occurs without a future explicit write approval. */
export const aiActionDrafts = mysqlTable(
  "aiActionDrafts",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    storeId: bigint("storeId", { mode: "number" })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    recommendationId: bigint("recommendationId", { mode: "number" }).references(() => recommendations.id, { onDelete: "set null" }),
    productId: bigint("productId", { mode: "number" }).references(() => products.id, { onDelete: "set null" }),
    actionType: mysqlEnum("actionType", ["product_description", "positioning"]).notNull(),
    originalContent: text("originalContent").notNull(),
    generatedContent: text("generatedContent").notNull(),
    inputEvidenceJson: text("inputEvidenceJson").notNull(),
    status: mysqlEnum("status", ["generated", "approved", "rejected"]).default("generated").notNull(),
    approvedAt: timestamp("approvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("ai_action_drafts_store_status_idx").on(table.storeId, table.status)]
);

/** Decision history is the durable learning trail for the merchant’s Business Brain. */
export const businessBrainEvents = mysqlTable(
  "businessBrainEvents",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    storeId: bigint("storeId", { mode: "number" })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    eventType: mysqlEnum("eventType", ["scan_completed", "recommendation_approved", "recommendation_dismissed", "draft_generated", "draft_approved", "draft_rejected", "action_completed", "outcome_measured"]).notNull(),
    entityType: varchar("entityType", { length: 80 }).notNull(),
    entityId: bigint("entityId", { mode: "number" }),
    payloadJson: text("payloadJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("business_brain_events_store_idx").on(table.storeId, table.createdAt)]
);

/** Measurement windows capture revenue impact only after a seller confirms an action. */
export const recommendationActions = mysqlTable(
  "recommendationActions",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    recommendationId: bigint("recommendationId", { mode: "number" })
      .notNull()
      .references(() => recommendations.id, { onDelete: "cascade" }),
    actedAt: timestamp("actedAt").notNull(),
    baselineStart: timestamp("baselineStart").notNull(),
    baselineEnd: timestamp("baselineEnd").notNull(),
    baselineRevenue: decimal("baselineRevenue", { precision: 14, scale: 2 }).notNull(),
    comparisonStart: timestamp("comparisonStart").notNull(),
    comparisonEnd: timestamp("comparisonEnd").notNull(),
    comparisonRevenue: decimal("comparisonRevenue", { precision: 14, scale: 2 }),
    revenueChange: decimal("revenueChange", { precision: 14, scale: 2 }),
    measurementStatus: mysqlEnum("measurementStatus", ["waiting", "measured", "insufficient_data"])
      .default("waiting")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("recommendation_actions_recommendation_idx").on(table.recommendationId)]
);

/** Stripe identifiers only; Stripe remains the system of record for billing state and payment data. */
export const billingAccounts = mysqlTable(
  "billingAccounts",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("billing_accounts_user_unique").on(table.userId)]
);
