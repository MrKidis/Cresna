import { timingSafeEqual } from "crypto";
import type { Express, Request, Response } from "express";
import express from "express";
import { ENV } from "./_core/env";
import { updateRevenueCatEntitlement } from "./db";
import { planFromRevenueCatEntitlement } from "./revenueCatContract";

export type RevenueCatWebhookEvent = {
  type?: string;
  app_user_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number | null;
};

export function isRevenueCatWebhookEnabled(authorization: string | undefined) {
  return Boolean(authorization?.trim());
}

export function hasValidRevenueCatAuthorization(received: string | undefined, configured: string | undefined) {
  if (!isRevenueCatWebhookEnabled(configured) || !received) return false;
  const expected = configured!.trim();
  return received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export function mapRevenueCatWebhookEvent(event: RevenueCatWebhookEvent) {
  const entitlement = event.entitlement_ids?.find(identifier => planFromRevenueCatEntitlement(identifier)) || null;
  const plan = planFromRevenueCatEntitlement(entitlement);
  const active = Boolean(plan) && !["CANCELLATION", "EXPIRATION", "BILLING_ISSUE"].includes(event.type || "");
  const expiresAt = typeof event.expiration_at_ms === "number" ? new Date(event.expiration_at_ms) : null;
  return { appUserId: event.app_user_id || null, entitlement, plan, active, expiresAt, eventType: event.type || "UNKNOWN" };
}

export function registerRevenueCatWebhookRoutes(app: Express) {
  app.post("/api/revenuecat/webhook", express.json({ limit: "1mb" }), async (req: Request, res: Response) => {
    if (!isRevenueCatWebhookEnabled(ENV.revenueCatWebhookAuthorization)) return res.status(503).json({ error: "RevenueCat webhook authorization is not configured" });
    if (!hasValidRevenueCatAuthorization(req.get("authorization") || undefined, ENV.revenueCatWebhookAuthorization)) return res.status(401).json({ error: "Invalid RevenueCat webhook authorization" });
    const event = (req.body as { event?: RevenueCatWebhookEvent } | undefined)?.event;
    if (!event?.app_user_id) return res.status(400).json({ error: "RevenueCat event is missing an app user identifier" });
    const mapped = mapRevenueCatWebhookEvent(event);
    if (!mapped.plan) return res.status(202).json({ received: true, ignored: "unknown_or_legacy_entitlement" });
    const result = await updateRevenueCatEntitlement({ appUserId: event.app_user_id, entitlement: mapped.active ? mapped.entitlement : null, expiresAt: mapped.expiresAt });
    return res.status(result.updated ? 200 : 202).json({ received: true, mappedPlan: mapped.plan, active: mapped.active, ...result });
  });
}
