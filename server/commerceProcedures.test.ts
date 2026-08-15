import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers.ts";

vi.mock("./db.ts", async importOriginal => {
  const actual = await importOriginal<typeof import("./db.ts")>();
  return {
    ...actual,
    getAnalyticsOverview: vi.fn(async (userId: number) => ({ userId, store: null, metrics: null })),
    getCatalogProductsForUser: vi.fn(async (userId: number) => [{ id: 1, userId, title: "Verified product" }]),
  };
});

const user = { id: 41, openId: "firebase-user-41", email: "merchant@example.com", name: "Merchant", role: "user" } as any;
const context = { user, req: { protocol: "https", get: () => "cresna.test" } as any, res: {} as any };

describe("Cresna commerce tRPC procedures", () => {
  it("returns the protected analytics overview contract", async () => {
    const caller = appRouter.createCaller(context);
    await expect(caller.analytics.overview()).resolves.toMatchObject({ userId: 41, store: null });
  });

  it("returns catalog evidence through the production catalog procedure", async () => {
    const caller = appRouter.createCaller(context);
    await expect(caller.catalog.products()).resolves.toEqual([{ id: 1, userId: 41, title: "Verified product" }]);
  });

  it("keeps intelligence overview available as an aggregate-only protected contract", async () => {
    const caller = appRouter.createCaller(context);
    await expect(caller.intelligence.overview()).resolves.toMatchObject({ store: null, profile: null, scan: null, score: null, events: [] });
  });

  it("rejects an unauthenticated commerce caller", async () => {
    const caller = appRouter.createCaller({ ...context, user: null });
    await expect(caller.analytics.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
