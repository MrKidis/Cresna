import { describe, expect, it } from "vitest";
import { buildBetaInvitationMessage, getGmailDeliveryConfiguration } from "./betaInvitationEmail";

describe("Gmail beta invitation delivery", () => {
  it("stays unconfigured without a server-only Gmail sender and app password", () => {
    const configuration = getGmailDeliveryConfiguration();
    expect(configuration.isConfigured).toBe(Boolean(configuration.sender && configuration.appPassword));
  });

  it("creates a truthful sign-in invitation without billing, payment, or fabricated claims", () => {
    const invitation = buildBetaInvitationMessage({ recipient: "tester@example.com", invitationUrl: "https://cresna.example/app/beta" });
    expect(invitation.subject).toContain("Founding Beta");
    expect(invitation.text).toContain("seven days of full access");
    expect(invitation.html).toContain("https://cresna.example/app/beta");
    expect(invitation.text).not.toContain("free forever");
  });
});
