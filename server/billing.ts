import Stripe from "stripe";
import { getBetaInviteForUser, getWorkspaceProfile, listStripeCustomerReferences, updateStripeReferences } from "./db";
import { ENV } from "./_core/env";
import { isPermanentOwner } from "./accessRules";
import { BillingInterval, SubscriptionPlanKey, subscriptionPlans } from "./products";

const stripe = new Stripe(ENV.stripeSecretKey || "sk_missing");

export function getUnpaidPreviewAccess() {
  return {
    hasAccess: false,
    accessSource: "none" as const,
    subscription: null,
    plan: null,
    status: null,
    interval: null,
    currentPeriodEnd: null,
    previewMode: "unpaid" as const,
  };
}

type CurrentSubscription = { status: "active" | "trialing"; plan: string | null };

export function summarizeCurrentSubscriptions(subscriptions: CurrentSubscription[]) {
  return subscriptions.reduce((summary, subscription) => {
    if (subscription.status === "trialing") summary.trialingWorkspaces += 1;
    if (subscription.status === "active") summary.activeSubscriptions += 1;
    if (subscription.plan === "pro") summary.proSubscriptions += 1;
    if (subscription.plan === "growth") summary.growthSubscriptions += 1;
    if (!subscription.plan || (subscription.plan !== "pro" && subscription.plan !== "growth")) summary.unmappedSubscriptions += 1;
    return summary;
  }, { activeSubscriptions: 0, trialingWorkspaces: 0, proSubscriptions: 0, growthSubscriptions: 0, unmappedSubscriptions: 0 });
}

export async function getPlatformBillingSummary() {
  if (!ENV.stripeSecretKey) {
    return { isConfigured: false, activeSubscriptions: 0, trialingWorkspaces: 0, proSubscriptions: 0, growthSubscriptions: 0, unmappedSubscriptions: 0, syncError: null as string | null };
  }
  try {
    const customers = await listStripeCustomerReferences();
    const current = await Promise.all(customers.map(async ({ stripeCustomerId }) => {
      const subscriptions = await stripe.subscriptions.list({ customer: stripeCustomerId, status: "all", limit: 20 });
      const active = subscriptions.data.find(item => item.status === "active" || item.status === "trialing");
      return active ? { status: active.status, plan: active.metadata.plan || null } as CurrentSubscription : null;
    }));
    return { isConfigured: true, ...summarizeCurrentSubscriptions(current.filter((item): item is CurrentSubscription => item !== null)), syncError: null as string | null };
  } catch (error) {
    console.error("[Billing] Unable to load aggregate subscription summary", error);
    return { isConfigured: true, activeSubscriptions: 0, trialingWorkspaces: 0, proSubscriptions: 0, growthSubscriptions: 0, unmappedSubscriptions: 0, syncError: "Cresna could not refresh Stripe aggregates right now." };
  }
}

function assertStripeConfigured() {
  if (!ENV.stripeSecretKey) throw new Error("Stripe is not configured");
}

async function ensureStripeCustomer(userId: number) {
  assertStripeConfigured();
  const user = await getWorkspaceProfile(userId);
  if (!user) throw new Error("User profile unavailable");
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({ email: user.email || undefined, name: user.name || undefined, metadata: { user_id: String(user.id) } });
  await updateStripeReferences(user.id, customer.id);
  return customer.id;
}

async function getOrCreatePrice(planKey: SubscriptionPlanKey, interval: BillingInterval) {
  assertStripeConfigured();
  const plan = subscriptionPlans[planKey];
  const activeProducts = await stripe.products.list({ active: true, limit: 100 });
  const product = activeProducts.data.find(item => item.metadata.cresna_plan === plan.key)
    ?? await stripe.products.create({ name: plan.name, metadata: { cresna_plan: plan.key } });
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const amount = interval === "year" ? plan.annualAmount : plan.monthlyAmount;
  const existing = prices.data.find(price => price.recurring?.interval === interval && price.unit_amount === amount && price.currency === plan.currency);
  return existing ?? stripe.prices.create({ product: product.id, currency: plan.currency, unit_amount: amount, recurring: { interval }, metadata: { cresna_plan: plan.key, cresna_interval: interval } });
}

export function buildCheckoutSessionConfig(input: {
  user: { id: number; email?: string | null; name?: string | null };
  customerId: string;
  priceId: string;
  origin: string;
  planKey: SubscriptionPlanKey;
}) {
  return {
    mode: "subscription" as const,
    customer: input.customerId,
    client_reference_id: String(input.user.id),
    line_items: [{ price: input.priceId, quantity: 1 }],
    payment_method_collection: "always" as const,
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: subscriptionPlans[input.planKey].trialDays,
      trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } },
      metadata: { user_id: String(input.user.id), plan: input.planKey },
    },
    metadata: { user_id: String(input.user.id), customer_email: input.user.email || "", customer_name: input.user.name || "", plan: input.planKey },
    success_url: `${input.origin}/app/billing?checkout=success`,
    cancel_url: `${input.origin}/app/billing?checkout=canceled`,
  };
}

export function hasLiveStripeAccess(subscription: { status: string; cancel_at_period_end?: boolean } | null | undefined) {
  if (!subscription) return false;
  if (subscription.status === "active") return true;
  return subscription.status === "trialing" && subscription.cancel_at_period_end !== true;
}

export async function createSubscriptionCheckout(input: { userId: number; origin: string; planKey: SubscriptionPlanKey; interval: BillingInterval }) {
  const user = await getWorkspaceProfile(input.userId);
  if (!user) throw new Error("User profile unavailable");
  const [customerId, price] = await Promise.all([ensureStripeCustomer(input.userId), getOrCreatePrice(input.planKey, input.interval)]);
  const session = await stripe.checkout.sessions.create(buildCheckoutSessionConfig({ user, customerId, priceId: price.id, origin: input.origin, planKey: input.planKey }));
  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return { checkoutUrl: session.url };
}

export async function createBillingPortal(userId: number, origin: string) {
  const customerId = await ensureStripeCustomer(userId);
  const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/app/billing` });
  return { portalUrl: session.url };
}

export async function getBillingAccess(userId: number) {
  const user = await getWorkspaceProfile(userId);
  if (!user) return { hasAccess: false, accessSource: "none" as const, subscription: null, plan: null, status: null, interval: null, currentPeriodEnd: null };
  if (isPermanentOwner(user.openId, ENV.ownerOpenId)) return { hasAccess: true, accessSource: "owner" as const, subscription: null, plan: "Growth", status: "owner", interval: null, currentPeriodEnd: null };
  const betaInvite = await getBetaInviteForUser(userId);
  if (betaInvite?.status === "active" && betaInvite.expiresAt && betaInvite.expiresAt > new Date()) return { hasAccess: true, accessSource: "beta" as const, subscription: null, plan: "Founding Beta", status: "active", interval: null, currentPeriodEnd: betaInvite.expiresAt };
  if (!user.stripeCustomerId || !ENV.stripeSecretKey) return { hasAccess: false, accessSource: "none" as const, subscription: null, plan: null, status: null, interval: null, currentPeriodEnd: null };
  const subscriptions = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "all", limit: 20 });
  const subscription = subscriptions.data.find(item => hasLiveStripeAccess(item)) ?? null;
  const recurring = subscription?.items.data[0]?.price.recurring;
  const periodEnd = subscription?.items.data[0]?.current_period_end;
  return { hasAccess: Boolean(subscription), accessSource: subscription ? "stripe" as const : "none" as const, subscription, plan: subscription?.metadata.plan || null, status: subscription?.status || null, interval: recurring?.interval || null, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null };
}

export async function handleStripeEvent(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = Number(session.client_reference_id || session.metadata?.user_id);
    if (Number.isSafeInteger(userId) && userId > 0) {
      await updateStripeReferences(userId, typeof session.customer === "string" ? session.customer : session.customer?.id, typeof session.subscription === "string" ? session.subscription : session.subscription?.id);
    }
  }
}

export function verifyStripeEvent(payload: Buffer, signature: string | undefined) {
  if (!ENV.stripeWebhookSecret) throw new Error("Stripe webhook signing secret is not configured");
  if (!signature) throw new Error("Missing Stripe signature");
  return stripe.webhooks.constructEvent(payload, signature, ENV.stripeWebhookSecret);
}
