import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { createCresnaApp } from "./app";

const app = createCresnaApp();
const server = app.listen(0);
let baseUrl = "";

beforeAll(() => {
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(() => {
  server.close();
});

describe("Cresna API health endpoint", () => {
  it("returns an explicit non-sensitive status without caching", async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ service: "cresna-api", status: "ok" });
  });
});
