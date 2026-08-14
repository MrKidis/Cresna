import { describe, expect, it } from "vitest";
import { isPermanentOwner, permitsBetaFeature } from "./accessRules";

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
});
