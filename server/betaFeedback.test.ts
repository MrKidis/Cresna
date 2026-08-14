import { describe, expect, it } from "vitest";
import { betaFeedbackInputSchema, toBetaFeedbackPersistenceValues } from "./betaFeedback";

describe("Founding Beta checkpoint feedback", () => {
  it("requires the checkpoint-specific structured fields", () => {
    expect(betaFeedbackInputSchema.safeParse({ checkpoint: "day_1", growthProfileRating: 4 }).success).toBe(true);
    expect(betaFeedbackInputSchema.safeParse({ checkpoint: "day_3", mostUsefulRecommendation: "The refund opportunity was clearest." }).success).toBe(true);
    expect(betaFeedbackInputSchema.safeParse({ checkpoint: "day_7", willingnessToPay: "probably", feedbackText: "I would like deeper product analysis." }).success).toBe(true);
  });

  it("rejects a day-seven submission without willingness-to-pay feedback", () => {
    expect(betaFeedbackInputSchema.safeParse({ checkpoint: "day_7", feedbackText: "Useful" }).success).toBe(false);
  });

  it("preserves the day-seven willingness-to-pay field in the persistence contract", () => {
    const input = betaFeedbackInputSchema.parse({ checkpoint: "day_7", willingnessToPay: "definitely", feedbackText: "The opportunity workflow is clear." });
    expect(toBetaFeedbackPersistenceValues(input, 99)).toEqual({
      betaInviteId: 99,
      checkpoint: "day_7",
      growthProfileRating: null,
      mostUsefulRecommendation: null,
      willingnessToPay: "definitely",
      feedbackText: "The opportunity workflow is clear.",
    });
  });
});
