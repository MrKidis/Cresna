import { describe, expect, it } from "vitest";
import { shouldAutoShowOnboarding } from "./onboardingPolicy";

describe("one-time onboarding policy", () => {
  it("shows only for a profile that has not started the tutorial", () => {
    expect(shouldAutoShowOnboarding("not_started")).toBe(true);
    expect(shouldAutoShowOnboarding("completed")).toBe(false);
    expect(shouldAutoShowOnboarding("dismissed")).toBe(false);
    expect(shouldAutoShowOnboarding(undefined)).toBe(false);
  });
});
