import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAnalyticsOverview,
  getCatalogProductsForUser,
  getMonthlyAiActionDraftCount,
  getBetaFeedbackForUser,
  getGrowthProfile,
  isBetaFeatureEnabledForUser,
  getOwnerOverview,
  getRecommendationActionsForUser,
  getRecommendationsForUser,
  getWorkspaceProfile,
  saveBetaFeedback,
  setBetaFeatureOverride,
  updateGrowthProfile,
  updateWorkspaceName,
} from "./db";
import { createBillingPortal, createSubscriptionCheckout, getBillingAccess, getPlatformBillingSummary, getUnpaidPreviewAccess } from "./billing";
import { isPermanentOwner, permitsBetaFeature } from "./accessRules";
import { ENV } from "./_core/env";
import { betaFeedbackInputSchema } from "./betaFeedback";
import { beginShopifyAuthorization, syncShopifyStore } from "./shopify";
import { approveRecommendationForUser, completeRecommendationForUser, dismissRecommendationForUser, generateRecommendationsForUser } from "./recommendationEngine";
import { getStoreIntelligenceForUser, refreshStoreIntelligence } from "./storeIntelligence";
import { generatePositioningDraft, generateProductDescriptionDraft, listAiActionDraftsForUser, updateAiActionDraftStatus } from "./aiActionStudio";
import { answerOwnerAssistant } from "./ownerAssistant";
import { getMonthlyAiActionLimit } from "./products";
import { createAndDeliverBetaInvite } from "./betaInvitationEmail";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  profile: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getWorkspaceProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      return profile;
    }),
    updateWorkspaceName: protectedProcedure
      .input(z.object({ workspaceName: z.string().trim().max(120) }))
      .mutation(async ({ ctx, input }) => {
        const profile = await updateWorkspaceName(ctx.user.id, input.workspaceName);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
        return profile;
      }),
  }),
  growthProfile: router({
    me: protectedProcedure.query(({ ctx }) => getGrowthProfile(ctx.user.id)),
    update: protectedProcedure.input(z.object({
      goals: z.array(z.enum(["more_sales", "more_customers", "brand_awareness", "better_seo", "competitor_edge", "improve_store", "not_sure"])).min(1).max(7),
      brandSummary: z.string().trim().max(1200).optional(),
      targetCustomer: z.string().trim().max(600).optional(),
      brandVoice: z.string().trim().max(120).optional(),
      brandValues: z.string().trim().max(600).optional(),
      positioning: z.string().trim().max(1000).optional(),
      differentiators: z.string().trim().max(1000).optional(),
    })).mutation(({ ctx, input }) => updateGrowthProfile({ userId: ctx.user.id, ...input })),
  }),
  intelligence: router({
    overview: protectedProcedure.query(({ ctx }) => getStoreIntelligenceForUser(ctx.user.id)),
    refresh: protectedProcedure.mutation(async ({ ctx }) => {
      const overview = await getAnalyticsOverview(ctx.user.id);
      if (!overview.store) throw new TRPCError({ code: "NOT_FOUND", message: "Connect a Shopify store first" });
      return refreshStoreIntelligence(overview.store.id);
    }),
  }),
  analytics: router({
    overview: protectedProcedure.query(({ ctx }) => getAnalyticsOverview(ctx.user.id)),
  }),
  catalog: router({
    products: protectedProcedure.query(({ ctx }) => getCatalogProductsForUser(ctx.user.id)),
  }),
  recommendations: router({
    list: protectedProcedure.query(({ ctx }) => getRecommendationsForUser(ctx.user.id)),
    generate: protectedProcedure.mutation(async ({ ctx }) => {
      const billing = await getBillingAccess(ctx.user.id);
      if (!billing.hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Start a trial or subscription to use AI recommendations" });
      if (!permitsBetaFeature(billing.accessSource, await isBetaFeatureEnabledForUser(ctx.user.id, "ai_recommendations"))) throw new TRPCError({ code: "FORBIDDEN", message: "AI recommendations are currently disabled for this beta workspace" });
      return generateRecommendationsForUser(ctx.user.id);
    }),
    approve: protectedProcedure.input(z.object({ recommendationId: z.number().int().positive() })).mutation(({ ctx, input }) => approveRecommendationForUser(ctx.user.id, input.recommendationId)),
    dismiss: protectedProcedure.input(z.object({ recommendationId: z.number().int().positive() })).mutation(({ ctx, input }) => dismissRecommendationForUser(ctx.user.id, input.recommendationId)),
    complete: protectedProcedure.input(z.object({ recommendationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const billing = await getBillingAccess(ctx.user.id);
      if (!permitsBetaFeature(billing.accessSource, await isBetaFeatureEnabledForUser(ctx.user.id, "outcome_measurement"))) throw new TRPCError({ code: "FORBIDDEN", message: "Outcome measurement is currently disabled for this beta workspace" });
      return completeRecommendationForUser(ctx.user.id, input.recommendationId);
    }),
  }),
  impact: router({
    list: protectedProcedure.query(({ ctx }) => getRecommendationActionsForUser(ctx.user.id)),
  }),
  aiActions: router({
    list: protectedProcedure.query(({ ctx }) => listAiActionDraftsForUser(ctx.user.id)),
    generateProductDescription: protectedProcedure.input(z.object({ productId: z.number().int().positive(), recommendationId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      const billing = await getBillingAccess(ctx.user.id);
      if (!billing.hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Start a trial or subscription to generate a custom AI action" });
      if (!permitsBetaFeature(billing.accessSource, await isBetaFeatureEnabledForUser(ctx.user.id, "ai_actions"))) throw new TRPCError({ code: "FORBIDDEN", message: "AI actions are currently disabled for this beta workspace" });
      const monthlyLimit = getMonthlyAiActionLimit(billing);
      if (await getMonthlyAiActionDraftCount(ctx.user.id) >= monthlyLimit) throw new TRPCError({ code: "FORBIDDEN", message: `Your ${billing.plan === "growth" ? "Growth" : "Pro"} plan has reached its monthly custom AI draft allowance. Upgrade or wait for your next billing month.` });
      return generateProductDescriptionDraft({ userId: ctx.user.id, ...input });
    }),
    generatePositioning: protectedProcedure.mutation(async ({ ctx }) => {
      const billing = await getBillingAccess(ctx.user.id);
      if (!billing.hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Start a trial or subscription to generate a custom AI action" });
      if (!permitsBetaFeature(billing.accessSource, await isBetaFeatureEnabledForUser(ctx.user.id, "ai_actions"))) throw new TRPCError({ code: "FORBIDDEN", message: "AI actions are currently disabled for this beta workspace" });
      const monthlyLimit = getMonthlyAiActionLimit(billing);
      if (await getMonthlyAiActionDraftCount(ctx.user.id) >= monthlyLimit) throw new TRPCError({ code: "FORBIDDEN", message: `Your ${billing.plan === "growth" ? "Growth" : "Pro"} plan has reached its monthly custom AI draft allowance. Upgrade or wait for your next billing month.` });
      return generatePositioningDraft({ userId: ctx.user.id });
    }),
    review: protectedProcedure.input(z.object({ draftId: z.number().int().positive(), status: z.enum(["approved", "rejected"]) })).mutation(({ ctx, input }) => updateAiActionDraftStatus({ userId: ctx.user.id, ...input })),
  }),
  foundingBeta: router({
    me: protectedProcedure.query(({ ctx }) => getBetaFeedbackForUser(ctx.user.id)),
    submitFeedback: protectedProcedure.input(betaFeedbackInputSchema).mutation(async ({ ctx, input }) => {
      const billing = await getBillingAccess(ctx.user.id);
      if (!permitsBetaFeature(billing.accessSource, await isBetaFeatureEnabledForUser(ctx.user.id, "beta_feedback"))) throw new TRPCError({ code: "FORBIDDEN", message: "Beta feedback is currently disabled for this workspace" });
      return saveBetaFeedback({ userId: ctx.user.id, ...input });
    }),
  }),
  owner: router({
    access: protectedProcedure.query(({ ctx }) => ({
      isOwner: isPermanentOwner(ctx.user.openId, ENV.ownerOpenId),
    })),
  }),
  preview: router({
    unpaidWorkspace: adminProcedure.query(() => getUnpaidPreviewAccess()),
  }),
  founder: router({
    overview: adminProcedure.query(async () => ({ ...(await getOwnerOverview()), billingSummary: await getPlatformBillingSummary() })),
    askAssistant: adminProcedure.input(z.object({ message: z.string().trim().min(1).max(1600) })).mutation(({ input }) => answerOwnerAssistant(input.message)),
    inviteBeta: adminProcedure.input(z.object({ email: z.string().trim().email().max(320) })).mutation(({ ctx, input }) => createAndDeliverBetaInvite({ ownerUserId: ctx.user.id, email: input.email, invitationUrl: `${ctx.req.protocol}://${ctx.req.get("host")}/app/beta` })),
    setBetaFeature: adminProcedure.input(z.object({ betaInviteId: z.number().int().positive(), featureKey: z.enum(["ai_recommendations", "ai_actions", "outcome_measurement", "beta_feedback"]), enabled: z.boolean() })).mutation(({ input }) => setBetaFeatureOverride(input.betaInviteId, input.featureKey, input.enabled)),
  }),
  shopify: router({
    begin: protectedProcedure.input(z.object({ shopDomain: z.string().trim().min(1).max(255) })).mutation(({ ctx, input }) => beginShopifyAuthorization(ctx.user.id, input.shopDomain, `${ctx.req.protocol}://${ctx.req.get("host")}`)),
    sync: protectedProcedure.mutation(async ({ ctx }) => {
      const overview = await getAnalyticsOverview(ctx.user.id);
      if (!overview.store) throw new TRPCError({ code: "NOT_FOUND", message: "Connect a Shopify store first" });
      return syncShopifyStore(overview.store.id);
    }),
  }),
  billing: router({
    status: protectedProcedure.query(({ ctx }) => getBillingAccess(ctx.user.id)),
    checkout: protectedProcedure.input(z.object({ plan: z.enum(["pro", "growth"]), interval: z.enum(["month", "year"]) })).mutation(({ ctx, input }) => createSubscriptionCheckout({ userId: ctx.user.id, origin: `${ctx.req.protocol}://${ctx.req.get("host")}`, planKey: input.plan, interval: input.interval })),
    portal: protectedProcedure.mutation(({ ctx }) => createBillingPortal(ctx.user.id, `${ctx.req.protocol}://${ctx.req.get("host")}`)),
  }),
});

export type AppRouter = typeof appRouter;
