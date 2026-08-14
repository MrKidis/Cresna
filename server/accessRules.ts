export type AccessSource = "owner" | "beta" | "stripe" | "revenuecat" | "free" | "none";

export function permitsBetaFeature(accessSource: AccessSource, featureEnabled: boolean) {
  return accessSource !== "beta" || featureEnabled;
}

/** During Cresna's closed beta, only the configured owner and an active invited beta tester may enter merchant workspace workflows. */
export function isClosedBetaAdmitted(accessSource: AccessSource) {
  return accessSource === "owner" || accessSource === "beta";
}

/**
 * The owner boundary is intentionally derived from deployment configuration,
 * never a client-provided value or a mutable workspace preference.
 */
export function isPermanentOwner(openId: string | null | undefined, configuredOwnerOpenId: string) {
  return Boolean(configuredOwnerOpenId) && openId === configuredOwnerOpenId;
}
