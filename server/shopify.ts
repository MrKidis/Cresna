import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { Express, Request, Response } from "express";
import express from "express";
import { and, eq } from "drizzle-orm";
import { collections, products, productDailyMetrics, storeDailyMetrics, stores } from "../drizzle/schema";
import { consumeShopifyOAuthState, createShopifyOAuthState, getDb, setGrowthProfileScanStatus } from "./db";
import { ENV } from "./_core/env";
import { refreshRevenueImpactForStore } from "./recommendationEngine";
import { refreshStoreIntelligence } from "./storeIntelligence";

const SHOPIFY_SCOPES = ["read_orders", "read_products", "read_customers"];
const SHOPIFY_API_VERSION = "2026-07";

type ShopifyShop = { id: string; name: string; myshopifyDomain: string; currencyCode: string };
type ShopifyOrder = { id: string; createdAt: string; currentTotalPriceSet: { shopMoney: { amount: string } }; totalRefundedSet?: { shopMoney: { amount: string } }; currentTotalDiscountsSet: { shopMoney: { amount: string } }; customer?: { id: string } | null; lineItems: { nodes: Array<{ quantity: number; discountedTotalSet: { shopMoney: { amount: string } }; variant?: { sku?: string | null; product?: { id: string; title: string } | null; inventoryItem?: { unitCost?: { amount: string } | null } | null } | null }> } };

function requireShopifyConfig() {
  if (!ENV.shopifyClientId || !ENV.shopifyClientSecret || !ENV.cookieSecret) throw new Error("Shopify OAuth credentials are not configured");
}

export function validateShopDomain(value: string) {
  const domain = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) throw new Error("Enter a valid .myshopify.com domain");
  return domain;
}

export function hasRequiredShopifyReadScopes(grantedScopes: string | null | undefined) {
  const granted = new Set((grantedScopes || "").split(",").map(scope => scope.trim()).filter(Boolean));
  return SHOPIFY_SCOPES.every(scope => granted.has(scope));
}

function hashState(state: string) { return createHash("sha256").update(state).digest("hex"); }
export function buildShopifyAuthorizationUrl(input: { shopDomain: string; clientId: string; origin: string; state: string }) { const url = new URL(`https://${input.shopDomain}/admin/oauth/authorize`); url.searchParams.set("client_id", input.clientId); url.searchParams.set("scope", SHOPIFY_SCOPES.join(",")); url.searchParams.set("redirect_uri", `${input.origin}/api/shopify/callback`); url.searchParams.set("state", input.state); return url.toString(); }
function getTokenKey() { return createHash("sha256").update(`${ENV.cookieSecret}:shopify-access-token`).digest(); }
function encryptToken(value: string) { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", getTokenKey(), iv); const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`; }
function decryptToken(value: string) { const [iv, tag, encrypted] = value.split("."); if (!iv || !tag || !encrypted) throw new Error("Invalid stored Shopify token"); const decipher = createDecipheriv("aes-256-gcm", getTokenKey(), Buffer.from(iv, "base64url")); decipher.setAuthTag(Buffer.from(tag, "base64url")); return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8"); }

function requestOrigin(req: Request) { return `${req.protocol}://${req.get("host")}`; }
export function isShopifyDisconnectTopic(topic: string | undefined) { return topic === "app/uninstalled"; }

export async function beginShopifyAuthorization(userId: number, inputDomain: string, origin: string) {
  requireShopifyConfig();
  const shopDomain = validateShopDomain(inputDomain);
  const state = randomBytes(32).toString("base64url");
  await createShopifyOAuthState(userId, shopDomain, hashState(state), new Date(Date.now() + 10 * 60 * 1000));
  return { authorizationUrl: buildShopifyAuthorizationUrl({ shopDomain, clientId: ENV.shopifyClientId, origin, state }) };
}

export function verifyOAuthCallback(query: Record<string, unknown>, clientSecret = ENV.shopifyClientSecret) {
  const received = typeof query.hmac === "string" ? query.hmac : "";
  const message = Object.entries(query).filter(([key]) => key !== "hmac" && key !== "signature").sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(",") : value}`).join("&");
  const expected = createHmac("sha256", clientSecret).update(message).digest("hex");
  if (!received || received.length !== expected.length || !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) throw new Error("Invalid Shopify authorization signature");
}

async function exchangeCode(shopDomain: string, code: string) {
  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: ENV.shopifyClientId, client_secret: ENV.shopifyClientSecret, code }) });
  if (!response.ok) throw new Error("Shopify could not exchange the authorization code");
  const token = await response.json() as { access_token?: string; scope?: string };
  if (!token.access_token) throw new Error("Shopify returned no access token");
  return token;
}

async function shopifyGraphql<T>(shopDomain: string, accessToken: string, query: string, variables?: Record<string, unknown>) {
  const response = await fetch(`https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken }, body: JSON.stringify({ query, variables }) });
  if (!response.ok) throw new Error(`Shopify data request failed with ${response.status}`);
  const payload = await response.json() as { data?: T; errors?: Array<{ message: string }> };
  if (payload.errors?.length) throw new Error(payload.errors.map(error => error.message).join("; "));
  if (!payload.data) throw new Error("Shopify returned no data");
  return payload.data;
}

async function installStore(input: { userId: number; shopDomain: string; accessToken: string; grantedScopes: string }) {
  const shopResponse = await shopifyGraphql<{ shop: ShopifyShop }>(input.shopDomain, input.accessToken, "query { shop { id name myshopifyDomain currencyCode } }");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  await db.insert(stores).values({ userId: input.userId, shopifyShopId: shopResponse.shop.id, myshopifyDomain: shopResponse.shop.myshopifyDomain, displayName: shopResponse.shop.name, currency: shopResponse.shop.currencyCode, accessTokenCiphertext: encryptToken(input.accessToken), grantedScopes: input.grantedScopes, connectionStatus: "connected", installedAt: now }).onDuplicateKeyUpdate({ set: { userId: input.userId, displayName: shopResponse.shop.name, currency: shopResponse.shop.currencyCode, accessTokenCiphertext: encryptToken(input.accessToken), grantedScopes: input.grantedScopes, connectionStatus: "connected", updatedAt: now } });
  const store = (await db.select().from(stores).where(eq(stores.shopifyShopId, shopResponse.shop.id)).limit(1))[0];
  if (!store) throw new Error("Store installation could not be saved");
  return store;
}

export async function syncShopifyStore(storeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const store = (await db.select().from(stores).where(eq(stores.id, storeId)).limit(1))[0];
  if (!store) throw new Error("Connected store not found");
  const accessToken = decryptToken(store.accessTokenCiphertext);
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const [orderResult, productResult, collectionResult] = await Promise.all([
    shopifyGraphql<{ orders: { nodes: ShopifyOrder[] } }>(store.myshopifyDomain, accessToken, "query Orders($query: String!) { orders(first: 250, sortKey: CREATED_AT, reverse: true, query: $query) { nodes { id createdAt currentTotalPriceSet { shopMoney { amount } } totalRefundedSet { shopMoney { amount } } currentTotalDiscountsSet { shopMoney { amount } } customer { id } lineItems(first: 250) { nodes { quantity discountedTotalSet { shopMoney { amount } } variant { sku product { id title } inventoryItem { unitCost { amount } } } } } } } }", { query: `created_at:>=${since}` }),
    shopifyGraphql<{ products: { nodes: Array<{ id: string; title: string; handle?: string | null; vendor?: string | null; productType?: string | null; status: string; totalInventory?: number | null; descriptionHtml?: string | null; seo?: { title?: string | null; description?: string | null } | null; mediaCount?: { count: number } | null; priceRangeV2?: { minVariantPrice: { amount: string }; maxVariantPrice: { amount: string } } | null; compareAtPriceRange?: { minVariantCompareAtPrice: { amount: string }; maxVariantCompareAtPrice: { amount: string } } | null; updatedAt: string }> } }>(store.myshopifyDomain, accessToken, "query Products { products(first: 250) { nodes { id title handle vendor productType status totalInventory descriptionHtml seo { title description } mediaCount { count } priceRangeV2 { minVariantPrice { amount } maxVariantPrice { amount } } compareAtPriceRange { minVariantCompareAtPrice { amount } maxVariantCompareAtPrice { amount } } updatedAt } } }"),
    shopifyGraphql<{ collections: { nodes: Array<{ id: string; title: string; handle?: string | null; descriptionHtml?: string | null; seo?: { title?: string | null; description?: string | null } | null; productsCount?: { count: number } | null; updatedAt: string }> } }>(store.myshopifyDomain, accessToken, "query Collections { collections(first: 250) { nodes { id title handle descriptionHtml seo { title description } productsCount { count } updatedAt } } }"),
  ]);
  let abandonedResult: { abandonedCheckouts: { nodes: Array<{ createdAt: string; completedAt?: string | null }> } } = { abandonedCheckouts: { nodes: [] } };
  try {
    abandonedResult = await shopifyGraphql<{ abandonedCheckouts: { nodes: Array<{ createdAt: string; completedAt?: string | null }> } }>(store.myshopifyDomain, accessToken, "query Abandoned($query: String!) { abandonedCheckouts(first: 250, query: $query) { nodes { createdAt completedAt } } }", { query: `created_at:>=${since} recovery_state:not_recovered` });
  } catch (error) {
    console.warn("[Shopify sync] Abandoned checkout data was unavailable; continuing without that signal", error instanceof Error ? error.message : error);
  }
  const now = new Date();
  for (const product of productResult.products.nodes) await db.insert(products).values({ storeId: store.id, shopifyProductId: product.id, title: product.title, handle: product.handle || null, vendor: product.vendor || null, productType: product.productType || null, status: product.status, totalInventory: product.totalInventory ?? null, descriptionHtml: product.descriptionHtml || null, seoTitle: product.seo?.title || null, seoDescription: product.seo?.description || null, mediaCount: product.mediaCount?.count ?? null, priceMin: product.priceRangeV2?.minVariantPrice.amount || null, priceMax: product.priceRangeV2?.maxVariantPrice.amount || null, compareAtPriceMin: product.compareAtPriceRange?.minVariantCompareAtPrice.amount || null, compareAtPriceMax: product.compareAtPriceRange?.maxVariantCompareAtPrice.amount || null, updatedAtSource: new Date(product.updatedAt) }).onDuplicateKeyUpdate({ set: { title: product.title, handle: product.handle || null, vendor: product.vendor || null, productType: product.productType || null, status: product.status, totalInventory: product.totalInventory ?? null, descriptionHtml: product.descriptionHtml || null, seoTitle: product.seo?.title || null, seoDescription: product.seo?.description || null, mediaCount: product.mediaCount?.count ?? null, priceMin: product.priceRangeV2?.minVariantPrice.amount || null, priceMax: product.priceRangeV2?.maxVariantPrice.amount || null, compareAtPriceMin: product.compareAtPriceRange?.minVariantCompareAtPrice.amount || null, compareAtPriceMax: product.compareAtPriceRange?.maxVariantCompareAtPrice.amount || null, updatedAtSource: new Date(product.updatedAt), updatedAt: now } });
  for (const collection of collectionResult.collections.nodes) await db.insert(collections).values({ storeId: store.id, shopifyCollectionId: collection.id, title: collection.title, handle: collection.handle || null, descriptionHtml: collection.descriptionHtml || null, seoTitle: collection.seo?.title || null, seoDescription: collection.seo?.description || null, productCount: collection.productsCount?.count || 0, updatedAtSource: new Date(collection.updatedAt) }).onDuplicateKeyUpdate({ set: { title: collection.title, handle: collection.handle || null, descriptionHtml: collection.descriptionHtml || null, seoTitle: collection.seo?.title || null, seoDescription: collection.seo?.description || null, productCount: collection.productsCount?.count || 0, updatedAtSource: new Date(collection.updatedAt), updatedAt: now } });
  const productRows = await db.select({ id: products.id, shopifyProductId: products.shopifyProductId }).from(products).where(eq(products.storeId, store.id));
  const productIdByShopifyId = new Map(productRows.map(product => [product.shopifyProductId, product.id]));
  const daily = new Map<string, { gross: number; net: number; orders: number; customers: Set<string>; checkouts: number; abandoned: number; refunds: number; refundAmount: number }>();
  const productDaily = new Map<string, { date: string; productId?: number; shopifyProductId: string; title: string; sku?: string | null; units: number; orders: number; refunds: number; gross: number; discount: number; refundAmount: number; cost: number }>();
  const dayRow = (date: string) => { const existing = daily.get(date); if (existing) return existing; const created = { gross: 0, net: 0, orders: 0, customers: new Set<string>(), checkouts: 0, abandoned: 0, refunds: 0, refundAmount: 0 }; daily.set(date, created); return created; };
  for (const order of orderResult.orders.nodes) { const date = order.createdAt.slice(0, 10); const row = dayRow(date); const net = Number(order.currentTotalPriceSet.shopMoney.amount); const refund = Number(order.totalRefundedSet?.shopMoney.amount || 0); row.gross += net + refund; row.net += net; row.orders += 1; row.checkouts += 1; row.refundAmount += refund; row.refunds += refund > 0 ? 1 : 0; if (order.customer?.id) row.customers.add(order.customer.id); for (const line of order.lineItems.nodes) { const product = line.variant?.product; if (!product) continue; const key = `${date}:${product.id}`; const entry = productDaily.get(key) ?? { date, productId: productIdByShopifyId.get(product.id), shopifyProductId: product.id, title: product.title, sku: line.variant?.sku || null, units: 0, orders: 0, refunds: 0, gross: 0, discount: 0, refundAmount: 0, cost: 0 }; entry.units += line.quantity; entry.orders += 1; entry.gross += Number(line.discountedTotalSet.shopMoney.amount); entry.refunds += refund > 0 ? 1 : 0; entry.refundAmount += refund; entry.cost += Number(line.variant?.inventoryItem?.unitCost?.amount || 0) * line.quantity; productDaily.set(key, entry); } }
  for (const checkout of abandonedResult.abandonedCheckouts.nodes) { if (checkout.completedAt) continue; const row = dayRow(checkout.createdAt.slice(0, 10)); row.abandoned += 1; row.checkouts += 1; }
  for (const [date, row] of Array.from(daily.entries())) await db.insert(storeDailyMetrics).values({ storeId: store.id, metricDate: new Date(`${date}T00:00:00.000Z`), grossRevenue: row.gross.toFixed(2), netRevenue: row.net.toFixed(2), orderCount: row.orders, customerCount: row.customers.size, checkoutCount: row.checkouts, abandonedCheckoutCount: row.abandoned, refundCount: row.refunds, refundAmount: row.refundAmount.toFixed(2), sourceUpdatedAt: now }).onDuplicateKeyUpdate({ set: { grossRevenue: row.gross.toFixed(2), netRevenue: row.net.toFixed(2), orderCount: row.orders, customerCount: row.customers.size, checkoutCount: row.checkouts, abandonedCheckoutCount: row.abandoned, refundCount: row.refunds, refundAmount: row.refundAmount.toFixed(2), sourceUpdatedAt: now, updatedAt: now } });
  for (const entry of Array.from(productDaily.values())) await db.insert(productDailyMetrics).values({ storeId: store.id, productId: entry.productId || null, shopifyProductId: entry.shopifyProductId, metricDate: new Date(`${entry.date}T00:00:00.000Z`), title: entry.title, sku: entry.sku || null, unitsSold: entry.units, orderCount: entry.orders, refundCount: entry.refunds, grossRevenue: entry.gross.toFixed(2), discountAmount: entry.discount.toFixed(2), refundAmount: entry.refundAmount.toFixed(2), costEstimate: entry.cost ? entry.cost.toFixed(2) : null, sourceUpdatedAt: now }).onDuplicateKeyUpdate({ set: { productId: entry.productId || null, title: entry.title, sku: entry.sku || null, unitsSold: entry.units, orderCount: entry.orders, refundCount: entry.refunds, grossRevenue: entry.gross.toFixed(2), discountAmount: entry.discount.toFixed(2), refundAmount: entry.refundAmount.toFixed(2), costEstimate: entry.cost ? entry.cost.toFixed(2) : null, sourceUpdatedAt: now, updatedAt: now } });
  await db.update(stores).set({ lastSyncedAt: now, connectionStatus: "connected" }).where(eq(stores.id, store.id));
  const intelligence = await refreshStoreIntelligence(store.id);
  await setGrowthProfileScanStatus(store.userId, intelligence.score.status === "needs_more_data" ? "needs_more_data" : "ready");
  await refreshRevenueImpactForStore(store.id);
  return { daysSynced: daily.size, productsSynced: productResult.products.nodes.length, collectionsSynced: collectionResult.collections.nodes.length, growthScoreStatus: intelligence.score.status };
}

async function subscribeToStoreEvents(storeId: number, origin: string) {
  const db = await getDb();
  if (!db) return;
  const store = (await db.select().from(stores).where(eq(stores.id, storeId)).limit(1))[0];
  if (!store) return;
  const accessToken = decryptToken(store.accessTokenCiphertext);
  for (const topic of ["ORDERS_CREATE", "ORDERS_UPDATED", "ORDERS_CANCELLED", "PRODUCTS_UPDATE", "APP_UNINSTALLED"]) {
    await shopifyGraphql(store.myshopifyDomain, accessToken, "mutation Subscribe($topic: WebhookSubscriptionTopic!, $subscription: WebhookSubscriptionInput!) { webhookSubscriptionCreate(topic: $topic, webhookSubscription: $subscription) { userErrors { field message } } }", { topic, subscription: { callbackUrl: `${origin}/api/shopify/webhook` } });
  }
}

export function registerShopifyRoutes(app: Express) {
  app.post("/api/shopify/webhook", express.raw({ type: "application/json" }), async (req, res) => { try { const signature = req.get("x-shopify-hmac-sha256") || ""; const expected = createHmac("sha256", ENV.shopifyClientSecret).update(req.body).digest("base64"); if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(401).json({ error: "Invalid webhook signature" }); const domain = req.get("x-shopify-shop-domain"); if (!domain) return res.status(400).json({ error: "Missing shop domain" }); const db = await getDb(); const store = db ? (await db.select().from(stores).where(eq(stores.myshopifyDomain, domain)).limit(1))[0] : undefined; if (store && isShopifyDisconnectTopic(req.get("x-shopify-topic"))) await db?.update(stores).set({ connectionStatus: "disconnected" }).where(eq(stores.id, store.id)); else if (store) await syncShopifyStore(store.id); res.json({ ok: true }); } catch (error) { console.error("[Shopify webhook]", error); res.status(500).json({ error: "Unable to process Shopify event" }); } });
  app.get("/api/shopify/callback", async (req, res) => { try { requireShopifyConfig(); verifyOAuthCallback(req.query); const shopDomain = validateShopDomain(String(req.query.shop || "")); const code = String(req.query.code || ""); const state = String(req.query.state || ""); if (!code || !state) throw new Error("Missing Shopify authorization values"); const oauthState = await consumeShopifyOAuthState(hashState(state)); if (!oauthState || oauthState.shopDomain !== shopDomain) throw new Error("This Shopify connection request has expired"); const token = await exchangeCode(shopDomain, code); const grantedScopes = token.scope || SHOPIFY_SCOPES.join(","); if (!hasRequiredShopifyReadScopes(grantedScopes)) throw new Error("Shopify did not grant Cresna’s required read scopes"); const store = await installStore({ userId: oauthState.userId, shopDomain, accessToken: token.access_token!, grantedScopes }); await subscribeToStoreEvents(store.id, requestOrigin(req)); try { await syncShopifyStore(store.id); } catch (syncError) { console.error("[Shopify sync]", syncError); } res.redirect("/app?shopify=connected"); } catch (error) { console.error("[Shopify callback]", error); res.redirect(`/app/connect?error=${encodeURIComponent(error instanceof Error ? error.message : "Shopify connection failed")}`); } });
}
