import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerShopifyRoutes } from "../shopify";
import { registerRevenueCatWebhookRoutes } from "../revenueCatWebhook";
import { handleStripeEvent, verifyStripeEvent } from "../billing";
import { appRouter } from "../routers";
import { createContext } from "./context";

/**
 * Builds Cresna's HTTP application without binding a port. Local development
 * attaches this app to an HTTP server; Vercel imports the same app as a
 * serverless handler. Keep webhooks before JSON parsing because Stripe
 * signature verification needs the unmodified request body.
 */
export function createCresnaApp() {
  const app = express();

  app.get("/api/health", (_req, res) => {
    res.set("cache-control", "no-store");
    return res.status(200).json({ service: "cresna-api", status: "ok" });
  });

  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const event = verifyStripeEvent(req.body, req.get("stripe-signature") || undefined);
      if (event.id.startsWith("evt_test_")) return res.json({ verified: true });
      await handleStripeEvent(event);
      return res.json({ received: true });
    } catch (error) {
      console.error("[Stripe webhook]", error);
      return res.status(400).json({ error: "Invalid Stripe webhook" });
    }
  });

  registerShopifyRoutes(app);
  registerRevenueCatWebhookRoutes(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  return app;
}
