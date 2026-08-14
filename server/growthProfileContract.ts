export function emptyGrowthProfileContract(userId: number) {
  return {
    id: null,
    userId,
    goalsJson: "[]",
    brandSummary: null,
    targetCustomer: null,
    brandVoice: null,
    brandValues: null,
    positioning: null,
    differentiators: null,
    scanStatus: "not_started" as const,
    lastScannedAt: null,
    createdAt: null,
    updatedAt: null,
  };
}

export function ensureGrowthProfileContract<T>(profile: T | null | undefined, userId: number) {
  return profile ?? emptyGrowthProfileContract(userId);
}
