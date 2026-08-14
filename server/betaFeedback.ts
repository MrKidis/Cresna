import { z } from "zod";

export const betaFeedbackInputSchema = z.discriminatedUnion("checkpoint", [
  z.object({ checkpoint: z.literal("day_1"), growthProfileRating: z.number().int().min(1).max(5), mostUsefulRecommendation: z.string().trim().max(1200).optional(), feedbackText: z.string().trim().max(3000).optional() }),
  z.object({ checkpoint: z.literal("day_3"), growthProfileRating: z.number().int().min(1).max(5).optional(), mostUsefulRecommendation: z.string().trim().min(1).max(1200), feedbackText: z.string().trim().max(3000).optional() }),
  z.object({ checkpoint: z.literal("day_7"), growthProfileRating: z.number().int().min(1).max(5).optional(), mostUsefulRecommendation: z.string().trim().max(1200).optional(), willingnessToPay: z.enum(["definitely", "probably", "maybe", "no"]), feedbackText: z.string().trim().min(1).max(3000) }),
]);

export type BetaFeedbackInput = z.infer<typeof betaFeedbackInputSchema>;

export function toBetaFeedbackPersistenceValues(input: BetaFeedbackInput, betaInviteId: number) {
  return {
    betaInviteId,
    checkpoint: input.checkpoint,
    growthProfileRating: input.growthProfileRating ?? null,
    mostUsefulRecommendation: input.mostUsefulRecommendation?.trim() || null,
    willingnessToPay: input.checkpoint === "day_7" ? input.willingnessToPay : null,
    feedbackText: input.feedbackText?.trim() || null,
  };
}
