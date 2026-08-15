import { describe, expect, it } from "vitest";
import { isPermanentOwnerIdentity } from "./accessRules";

describe("Firebase permanent owner identity", () => {
  it("matches the configured owner email case-insensitively", () => {
    const configuredEmail = process.env.OWNER_EMAIL;
    expect(configuredEmail, "OWNER_EMAIL must be configured").toBeTruthy();
    expect(isPermanentOwnerIdentity(null, configuredEmail!.toUpperCase(), "not-the-firebase-id", configuredEmail)).toBe(true);
    expect(isPermanentOwnerIdentity(null, "different@example.com", "not-the-firebase-id", configuredEmail)).toBe(false);
  });
});
