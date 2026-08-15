import { describe, expect, it } from "vitest";
import { resolveLLMProvider } from "./_core/llm";

describe("OpenRouter server credential", () => {
  it("keeps OpenRouter as the default and recognizes the optional Ollama adapter", () => {
    expect(resolveLLMProvider(undefined)).toBe("openrouter");
    expect(resolveLLMProvider("ollama")).toBe("ollama");
    expect(resolveLLMProvider("manus")).toBe("manus");
    expect(resolveLLMProvider("unexpected-provider")).toBe("openrouter");
  });

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

