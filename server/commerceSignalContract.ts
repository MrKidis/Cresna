export type CommerceSignalKey = "orders" | "catalog" | "customers" | "pricing" | "marketingContent" | "markets";

export const commerceSignalContracts: Record<CommerceSignalKey, { route: string; evidenceFields: string[]; availability: "supported" | "unavailable"; reason?: string }> = {
  orders: { route: "analytics.overview", evidenceFields: ["netRevenue", "orderCount", "checkoutCount", "abandonedCheckoutCount"], availability: "supported" },
  catalog: { route: "catalog.products", evidenceFields: ["title", "descriptionHtml", "seoTitle", "seoDescription", "mediaCount", "inventory", "price"], availability: "supported" },
  customers: { route: "analytics.overview", evidenceFields: ["customerCount", "newCustomerCount"], availability: "supported" },
  pricing: { route: "analytics.overview", evidenceFields: ["averageOrderValue", "discountAmount", "grossMargin"], availability: "supported" },
  marketingContent: { route: "catalog.products", evidenceFields: ["descriptionHtml", "seoTitle", "seoDescription", "collections"], availability: "supported" },
  markets: { route: "commerce.markets", evidenceFields: [], availability: "unavailable", reason: "Cresna has no connected market-intelligence provider and will not invent competitor, social, or external market data." },
};

export function getCommerceSignalContract(signal: CommerceSignalKey) {
  return commerceSignalContracts[signal];
}
