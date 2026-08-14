import { describe, expect, it } from "vitest";
import { requiresFinalBetaFeedbackForCheckout } from "./betaCheckoutPolicy";

describe("expired beta checkout policy", () => {
  it("blocks paid checkout after beta expiry until final feedback is present", () => {
    expect(requiresFinalBetaFeedbackForCheckout({ invitationStatus: "expired", submittedCheckpoints: ["day_1"] })).toBe(true);
    expect(requiresFinalBetaFeedbackForCheckout({ invitationStatus: "expired", submittedCheckpoints: ["day_1", "day_7"] })).toBe(false);
    expect(requiresFinalBetaFeedbackForCheckout({ invitationStatus: "active", submittedCheckpoints: [] })).toBe(false);
    expect(requiresFinalBetaFeedbackForCheckout({ invitationStatus: null, submittedCheckpoints: [] })).toBe(false);
  });
});
