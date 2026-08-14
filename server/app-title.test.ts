import { describe, expect, it } from "vitest";

describe("managed application title", () => {
  it("exposes the finalized Cresna title to the application environment", () => {
    expect(process.env.VITE_APP_TITLE).toBe("Cresna");
  });
});
