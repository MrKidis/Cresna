export type AccessSource = "owner" | "beta" | "stripe" | "none";

export function permitsBetaFeature(accessSource: AccessSource, featureEnabled: boolean) {
  return accessSource !== "beta" || featureEnabled;
}

/**
 * The owner boundary is intentionally derived from deployment configuration,
 * never a client-provided value or a mutable workspace preference.
 */
export function isPermanentOwner(openId: string | null | undefined, configuredOwnerOpenId: string) {
  return Boolean(configuredOwnerOpenId) && openId === configuredOwnerOpenId;
}
