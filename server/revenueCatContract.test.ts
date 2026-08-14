import { describe, expect, it } from "vitest";
import { planFromRevenueCatEntitlement, revenueCatContract } from "./revenueCatContract";

describe("RevenueCat readiness contract", () => {
  it("maps only prepared Cresna Pro and Growth entitlements to paid plans", () => {
    expect(revenueCatContract.offering).toBe("cresna_default");
    expect(planFromRevenueCatEntitlement("cresna_pro")).toBe("pro");
    expect(planFromRevenueCatEntitlement("cresna_growth")).toBe("growth");
    expect(planFromRevenueCatEntitlement("pro")).toBeNull();
    expect(planFromRevenueCatEntitlement(undefined)).toBeNull();
  });
});
