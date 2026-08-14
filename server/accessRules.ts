export type AccessSource = "owner" | "beta" | "stripe" | "none";

export function permitsBetaFeature(accessSource: AccessSource, featureEnabled: boolean) {
  return accessSource !== "beta" || featureEnabled;
}
