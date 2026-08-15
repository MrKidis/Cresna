import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId, upsertUser } from "../db";
import { verifyFirebaseRequest } from "../firebaseAdmin";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  if (!user) {
    try {
      const firebaseUser = await verifyFirebaseRequest(opts.req);
      if (firebaseUser) {
        await upsertUser({
          openId: firebaseUser.uid,
          email: firebaseUser.email ?? null,
          name: firebaseUser.name ?? firebaseUser.email?.split("@")[0] ?? "Cresna merchant",
          loginMethod: firebaseUser.firebase?.sign_in_provider ?? "firebase",
          lastSignedIn: new Date(),
        });
        user = (await getUserByOpenId(firebaseUser.uid)) ?? null;
      }
    } catch (error) {
      console.warn("[Firebase Auth] Request verification unavailable:", error);
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
