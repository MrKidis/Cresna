import { describe, expect, it } from "vitest";
import { emptyGrowthProfileContract, ensureGrowthProfileContract } from "./growthProfileContract";

describe("Growth Profile first-use contract", () => {
  it("returns a stable empty profile when a workspace has not saved any Growth Profile fields", () => {
    expect(ensureGrowthProfileContract(undefined, 42)).toEqual({
      id: null,
      userId: 42,
      goalsJson: "[]",
      brandSummary: null,
      targetCustomer: null,
      brandVoice: null,
      brandValues: null,
      positioning: null,
      differentiators: null,
      scanStatus: "not_started",
      lastScannedAt: null,
      createdAt: null,
      updatedAt: null,
    });
  });

  it("preserves an existing persisted profile", () => {
    const existing = { ...emptyGrowthProfileContract(12), id: 7, goalsJson: '["more_sales"]', scanStatus: "ready" as const };
    expect(ensureGrowthProfileContract(existing, 12)).toBe(existing);
  });
});
