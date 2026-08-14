export type PersistedOnboardingStatus = "not_started" | "completed" | "dismissed";

export function shouldAutoShowOnboarding(status: PersistedOnboardingStatus | null | undefined) {
  return status === "not_started";
}
