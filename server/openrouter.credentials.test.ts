import { describe, expect, it } from "vitest";

describe("OpenRouter server credential", () => {
  it("authenticates against the models endpoint when configured", async () => {
    const apiKey = process.env.AI_PROVIDER_API_KEY;
    expect(apiKey, "AI_PROVIDER_API_KEY must be configured for this integration test").toBeTruthy();

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status, await response.text()).toBe(200);
  }, 20_000);
});

