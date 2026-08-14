import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createUninvitedContext(): TrpcContext {
  return {
    user: {
      id: 999_001,
      openId: "uninvited-user-open-id",
      email: "uninvited@example.com",
      name: "Uninvited user",
      loginMethod: "google",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", get: () => "cresna.example", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("public workspace and owner access", () => {
  it("allows a signed-in free user to view an empty workspace without fabricating merchant data", async () => {
    const caller = appRouter.createCaller(createUninvitedContext());
    await expect(caller.analytics.overview()).resolves.toEqual({ store: null, dailyMetrics: [], productMetrics: [] });
  });

  it("rejects the owner-only aggregate panel for a signed-in non-owner", async () => {
    const caller = appRouter.createCaller(createUninvitedContext());
    await expect(caller.founder.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
