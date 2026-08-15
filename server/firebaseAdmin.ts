import type { App } from "firebase-admin/app";
import type { Request } from "express";

let cachedApp: App | null = null;

async function getFirebaseAdminApp() {
  if (cachedApp) return cachedApp;

  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  if (getApps().length > 0) {
    cachedApp = getApps()[0]!;
    return cachedApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ?.replace(/^\"|\"$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/-----BEGINPRIVATEKEY-----/g, "-----BEGIN PRIVATE KEY-----")
    .replace(/-----ENDPRIVATEKEY-----/g, "-----END PRIVATE KEY-----");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured");
  }

  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return cachedApp;
}

export async function verifyFirebaseRequest(req: Request) {
  const authorization = req.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;

  try {
    const { getAuth } = await import("firebase-admin/auth");
    return await getAuth(await getFirebaseAdminApp()).verifyIdToken(token);
  } catch {
    return null;
  }
}
