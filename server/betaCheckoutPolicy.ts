export function requiresFinalBetaFeedbackForCheckout(input: {
  invitationStatus: string | null | undefined;
  submittedCheckpoints: string[];
}) {
  return input.invitationStatus === "expired" && !input.submittedCheckpoints.includes("day_7");
}
