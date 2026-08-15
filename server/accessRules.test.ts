import { describe, expect, it } from "vitest";
import { isClosedBetaAdmitted, isPermanentOwner, isPermanentOwnerIdentity, permitsBetaFeature } from "./accessRules";

describe("beta feature access", () => {
  it("keeps paid and owner access independent from beta feature flags", () => {
    expect(permitsBetaFeature("owner", false)).toBe(true);
    expect(permitsBetaFeature("stripe", false)).toBe(true);
    expect(permitsBetaFeature("none", false)).toBe(true);
  });

  it("honors a disabled beta feature", () => {
    expect(permitsBetaFeature("beta", false)).toBe(false);
    expect(permitsBetaFeature("beta", true)).toBe(true);
  });

  it("recognizes only the configured owner identity as permanent owner", () => {
    expect(isPermanentOwner("owner-open-id", "owner-open-id")).toBe(true);
    expect(isPermanentOwner("other-open-id", "owner-open-id")).toBe(false);
    expect(isPermanentOwner(undefined, "owner-open-id")).toBe(false);
    expect(isPermanentOwner("owner-open-id", "")).toBe(false);
  });

  it("maps the configured owner email without accepting another identity", () => {
    expect(isPermanentOwnerIdentity("firebase-uid", "Owner@Example.com", "legacy-owner", "owner@example.com")).toBe(true);
    expect(isPermanentOwnerIdentity("firebase-uid", "other@example.com", "legacy-owner", "owner@example.com")).toBe(false);
    expect(isPermanentOwnerIdentity("legacy-owner", null, "legacy-owner", "owner@example.com")).toBe(true);
  });

  it("admits only the permanent owner and active invited beta workspaces during closed beta", () => {
    expect(isClosedBetaAdmitted("owner")).toBe(true);
    expect(isClosedBetaAdmitted("beta")).toBe(true);
    expect(isClosedBetaAdmitted("stripe")).toBe(false);
    expect(isClosedBetaAdmitted("none")).toBe(false);
  });
});
