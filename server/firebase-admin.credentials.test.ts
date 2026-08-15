import { describe, expect, it } from "vitest";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

describe("Firebase Admin server credentials", () => {
  it("authenticates and reaches Firebase Auth without writing data", async () => {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
      ?.replace(/^\"|\"$/g, "")
      .replace(/\\n/g, "\n")
      .replace(/-----BEGINPRIVATEKEY-----/g, "-----BEGIN PRIVATE KEY-----")
      .replace(/-----ENDPRIVATEKEY-----/g, "-----END PRIVATE KEY-----");

    expect(projectId, "FIREBASE_ADMIN_PROJECT_ID must be configured").toBeTruthy();
    expect(clientEmail, "FIREBASE_ADMIN_CLIENT_EMAIL must be configured").toBeTruthy();
    expect(privateKey, "FIREBASE_ADMIN_PRIVATE_KEY must be configured").toContain("BEGIN PRIVATE KEY");

    const app = getApps()[0] ?? initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });

    const page = await getAuth(app).listUsers(1);
    expect(Array.isArray(page.users)).toBe(true);
  }, 20_000);
});
