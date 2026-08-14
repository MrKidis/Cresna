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
  getMerchantWriteApprovalsForUser,
  getBetaFeedbackForUser,
  getBetaInviteForUser,
  getGrowthProfile,
  isBetaFeatureEnabledForUser,
  getOwnerOverview,
  getRecommendationActionsForUser,
  getUserNotificationPreferences,
  getUserOnboarding,
  getRecommendationsForUser,
  getWorkspaceProfile,
  createBetaAccessRequest,
  getBetaAccessRequest,
  listBetaAccessRequests,
  markBetaAccessRequestInvited,
  saveBetaFeedback,
  setBetaFeatureOverride,
  updateUserNotificationPreferences,
  setUserOnboardingStatus,
  updateGrowthProfile,
  requestMerchantWriteApproval,
  updateWorkspaceName,
} from "./db";
import { createBillingPortal, createSubscriptionCheckout, getBillingAccess, getPlatformBillingSummary, getUnpaidPreviewAccess } from "./billing";
import { isClosedBetaAdmitted, isPermanentOwner, permitsBetaFeature } from "./accessRules";
import { ENV } from "./_core/env";
import { betaFeedbackInputSchema } from "./betaFeedback";
import { beginShopifyAuthorization, syncShopifyStore } from "./shopify";
import { approveRecommendationForUser, completeRecommendationForUser, dismissRecommendationForUser, generateRecommendationsForUser } from "./recommendationEngine";
import { getStoreIntelligenceForUser, refreshStoreIntelligence } from "./storeIntelligence";
import { generatePositioningDraft, generateProductDescriptionDraft, listAiActionDraftsForUser, updateAiActionDraftStatus } from "./aiActionStudio";
import { answerOwnerAssistant } from "./ownerAssistant";
import { getMonthlyAiActionLimit } from "./products";
import { createAndDeliverBetaInvite } from "./betaInvitationEmail";
import { ensureGrowthProfileContract } from "./growthProfileContract";
import { requiresFinalBetaFeedbackForCheckout } from "./betaCheckoutPolicy";

const closedBetaWorkspaceProcedure = protectedProcedure;

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
  betaAccess: router({
    request: publicProcedure.input(z.object({
      email: z.string().trim().email().max(320),
      storeUrl: z.string().trim().max(255).optional(),
      note: z.string().trim().max(1200).optional(),
    })).mutation(async ({ input }) => {
      const request = await createBetaAccessRequest(input);
      return { requestId: request.id, status: request.status };
    }),
  }),
  profile: router({
    me: closedBetaWorkspaceProcedure.query(async ({ ctx }) => {
      const profile = await getWorkspaceProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      return profile;
    }),
    updateWorkspaceName: closedBetaWorkspaceProcedure
      .input(z.object({ workspaceName: z.string().trim().max(120) }))
      .mutation(async ({ ctx, input }) => {
        const profile = await updateWorkspaceName(ctx.user.id, input.workspaceName);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
        return profile;
      }),
  }),
  onboarding: router({
    me: protectedProcedure.query(({ ctx }) => getUserOnboarding(ctx.user.id)),
    setStatus: protectedProcedure.input(z.object({ status: z.enum(["not_started", "completed", "dismissed"]) })).mutation(({ ctx, input }) => setUserOnboardingStatus(ctx.user.id, input.status)),
  }),
  notifications: router({
    preferences: protectedProcedure.query(({ ctx }) => getUserNotificationPreferences(ctx.user.id)),
    updatePreferences: protectedProcedure.input(z.object({ betaUpdates: z.boolean(), productUpdates: z.boolean() })).mutation(({ ctx, input }) => updateUserNotificationPreferences({ userId: ctx.user.id, ...input })),
  }),
  growthProfile: router({
    me: closedBetaWorkspaceProcedure.query(async ({ ctx }) => ensureGrowthProfileContract(await getGrowthProfile(ctx.user.id), ctx.user.id)),
    update: closedBetaWorkspaceProcedure.input(z.object({
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
    overview: closedBetaWorkspaceProcedure.query(({ ctx }) => getStoreIntelligenceForUser(ctx.user.id)),
    refresh: closedBetaWorkspaceProcedure.mutation(async ({ ctx }) => {
      const overview = await getAnalyticsOverview(ctx.user.id);
      if (!overview.store) throw new TRPCError({ code: "NOT_FOUND", message: "Connect a Shopify store first" });
      return refreshStoreIntelligence(overview.store.id);
    }),
  }),
  analytics: router({
    overview: closedBetaWorkspaceProcedure.query(({ ctx }) => getAnalyticsOverview(ctx.user.id)),
  }),
  catalog: router({
    products: closedBetaWorkspaceProcedure.query(({ ctx }) => getCatalogProductsForUser(ctx.user.id)),
  }),
  recommendations: router({
    list: closedBetaWorkspaceProcedure.query(({ ctx }) => getRecommendationsForUser(ctx.user.id)),
    generate: closedBetaWorkspaceProcedure.mutation(async ({ ctx }) => {
      const billing = await getBillingAccess(ctx.user.id);
      if (!billing.hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Start a trial or subscription to use AI recommendations" });
      if (!permitsBetaFeature(billing.accessSource, await isBetaFeatureEnabledForUser(ctx.user.id, "ai_recommendations"))) throw new TRPCError({ code: "FORBIDDEN", message: "AI recommendations are currently disabled for this beta workspace" });
      return generateRecommendationsForUser(ctx.user.id);
    }),
    approve: closedBetaWorkspaceProcedure.input(z.object({ recommendationId: z.number().int().positive() })).mutation(({ ctx, input }) => approveRecommendationForUser(ctx.user.id, input.recommendationId)),
    dismiss: closedBetaWorkspaceProcedure.input(z.object({ recommendationId: z.number().int().positive() })).mutation(({ ctx, input }) => dismissRecommendationForUser(ctx.user.id, input.recommendationId)),
    complete: closedBetaWorkspaceProcedure.input(z.object({ recommendationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const billing = await getBillingAccess(ctx.user.id);
      if (!permitsBetaFeature(billing.accessSource, await isBetaFeatureEnabledForUser(ctx.user.id, "outcome_measurement"))) throw new TRPCError({ code: "FORBIDDEN", message: "Outcome measurement is currently disabled for this beta workspace" });
      return completeRecommendationForUser(ctx.user.id, input.recommendationId);
    }),
  }),
  impact: router({
    list: closedBetaWorkspaceProcedure.query(({ ctx }) => getRecommendationActionsForUser(ctx.user.id)),
  }),
  aiActions: router({
    list: closedBetaWorkspaceProcedure.query(({ ctx }) => listAiActionDraftsForUser(ctx.user.id)),
    generateProductDescription: closedBetaWorkspaceProcedure.input(z.object({ productId: z.number().int().positive(), recommendationId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      const billing = await getBillingAccess(ctx.user.id);
      if (!billing.hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Start a trial or subscription to generate a custom AI action" });
      if (!permitsBetaFeature(billing.accessSource, await isBetaFeatureEnabledForUser(ctx.user.id, "ai_actions"))) throw new TRPCError({ code: "FORBIDDEN", message: "AI actions are currently disabled for this beta workspace" });
      const monthlyLimit = getMonthlyAiActionLimit(billing);
      if (await getMonthlyAiActionDraftCount(ctx.user.id) >= monthlyLimit) throw new TRPCError({ code: "FORBIDDEN", message: `Your ${billing.plan === "growth" ? "Growth" : "Pro"} plan has reached its monthly custom AI draft allowance. Upgrade or wait for your next billing month.` });
      return generateProductDescriptionDraft({ userId: ctx.user.id, ...input });
    }),
    generatePositioning: closedBetaWorkspaceProcedure.mutation(async ({ ctx }) => {
      const billing = await getBillingAccess(ctx.user.id);
      if (!billing.hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Start a trial or subscription to generate a custom AI action" });
      if (!permitsBetaFeature(billing.accessSource, await isBetaFeatureEnabledForUser(ctx.user.id, "ai_actions"))) throw new TRPCError({ code: "FORBIDDEN", message: "AI actions are currently disabled for this beta workspace" });
      const monthlyLimit = getMonthlyAiActionLimit(billing);
      if (await getMonthlyAiActionDraftCount(ctx.user.id) >= monthlyLimit) throw new TRPCError({ code: "FORBIDDEN", message: `Your ${billing.plan === "growth" ? "Growth" : "Pro"} plan has reached its monthly custom AI draft allowance. Upgrade or wait for your next billing month.` });
      return generatePositioningDraft({ userId: ctx.user.id });
    }),
    review: closedBetaWorkspaceProcedure.input(z.object({ draftId: z.number().int().positive(), status: z.enum(["approved", "rejected"]) })).mutation(({ ctx, input }) => updateAiActionDraftStatus({ userId: ctx.user.id, ...input })),
    writeApprovals: closedBetaWorkspaceProcedure.query(({ ctx }) => getMerchantWriteApprovalsForUser(ctx.user.id)),
    requestWriteApproval: closedBetaWorkspaceProcedure.input(z.object({ draftId: z.number().int().positive(), approvalNote: z.string().trim().max(600).optional() })).mutation(({ ctx, input }) => requestMerchantWriteApproval({ userId: ctx.user.id, ...input })),
  }),
  foundingBeta: router({
    me: closedBetaWorkspaceProcedure.query(({ ctx }) => getBetaFeedbackForUser(ctx.user.id)),
    submitFeedback: closedBetaWorkspaceProcedure.input(betaFeedbackInputSchema).mutation(async ({ ctx, input }) => {
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
    accessRequests: adminProcedure.query(() => listBetaAccessRequests()),
    inviteAccessRequest: adminProcedure.input(z.object({ requestId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const request = await getBetaAccessRequest(input.requestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Beta access request not found" });
      const invitation = await createAndDeliverBetaInvite({ ownerUserId: ctx.user.id, email: request.email, invitationUrl: `${ctx.req.protocol}://${ctx.req.get("host")}/app/beta` });
      await markBetaAccessRequestInvited(request.id, ctx.user.id);
      return invitation;
    }),
    askAssistant: adminProcedure.input(z.object({ message: z.string().trim().min(1).max(1600) })).mutation(({ input }) => answerOwnerAssistant(input.message)),
    inviteBeta: adminProcedure.input(z.object({ email: z.string().trim().email().max(320) })).mutation(({ ctx, input }) => createAndDeliverBetaInvite({ ownerUserId: ctx.user.id, email: input.email, invitationUrl: `${ctx.req.protocol}://${ctx.req.get("host")}/app/beta` })),
    setBetaFeature: adminProcedure.input(z.object({ betaInviteId: z.number().int().positive(), featureKey: z.enum(["ai_recommendations", "ai_actions", "outcome_measurement", "beta_feedback"]), enabled: z.boolean() })).mutation(({ input }) => setBetaFeatureOverride(input.betaInviteId, input.featureKey, input.enabled)),
  }),
  shopify: router({
    begin: closedBetaWorkspaceProcedure.input(z.object({ shopDomain: z.string().trim().min(1).max(255) })).mutation(({ ctx, input }) => beginShopifyAuthorization(ctx.user.id, input.shopDomain, `${ctx.req.protocol}://${ctx.req.get("host")}`)),
    sync: closedBetaWorkspaceProcedure.mutation(async ({ ctx }) => {
      const overview = await getAnalyticsOverview(ctx.user.id);
      if (!overview.store) throw new TRPCError({ code: "NOT_FOUND", message: "Connect a Shopify store first" });
      return syncShopifyStore(overview.store.id);
    }),
  }),
  billing: router({
    status: protectedProcedure.query(({ ctx }) => getBillingAccess(ctx.user.id)),
    checkout: closedBetaWorkspaceProcedure.input(z.object({ plan: z.enum(["pro", "growth"]), interval: z.enum(["month", "year"]) })).mutation(async ({ ctx, input }) => {
      const betaInvite = await getBetaInviteForUser(ctx.user.id);
      const feedback = await getBetaFeedbackForUser(ctx.user.id);
      if (requiresFinalBetaFeedbackForCheckout({ invitationStatus: betaInvite?.status, submittedCheckpoints: feedback.feedback.map(item => item.checkpoint) })) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your beta access has ended. Submit the final private feedback check-in before choosing a paid plan." });
      }
      return createSubscriptionCheckout({ userId: ctx.user.id, origin: `${ctx.req.protocol}://${ctx.req.get("host")}`, planKey: input.plan, interval: input.interval });
    }),
    portal: closedBetaWorkspaceProcedure.mutation(({ ctx }) => createBillingPortal(ctx.user.id, `${ctx.req.protocol}://${ctx.req.get("host")}`)),
  }),
});

export type AppRouter = typeof appRouter;
