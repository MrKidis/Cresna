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
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("founding_beta_invites_status_idx").on(table.status)]
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
    updatedAtSource: timestamp("updatedAtSource").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("products_store_shopify_product_unique").on(table.storeId, table.shopifyProductId),
    index("products_store_idx").on(table.storeId),
  ]
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
