import { describe, expect, it } from "vitest";
import { permitsBetaFeature } from "./accessRules";

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
});
