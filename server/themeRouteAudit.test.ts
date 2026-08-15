import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Cresna theme and route audit", () => {
  it("keeps the semantic theme contract and branded public shell", () => {
    const css = read("client/src/index.css");
    const app = read("client/src/App.tsx");
    expect(css).toContain(".dark");
    expect(css).toContain("--background");
    expect(css).toContain("--foreground");
    expect(app).toContain("ThemeProvider");
    expect(app).not.toContain("Made with Manus");
  });

  it("registers the high-traffic workspace routes used by navigation", () => {
    const app = read("client/src/App.tsx");
    for (const route of ["/app", "/app/profile", "/app/connect", "/app/actions", "/app/ai-studio", "/app/owner-panel"]) {
      expect(app).toContain(route);
    }
  });

  it("keeps active workspace surfaces on semantic interaction classes where audited", () => {
    const layout = read("client/src/components/DashboardLayout.tsx");
    const aiStudio = read("client/src/pages/AIStudio.tsx");
    expect(layout).toContain("text-foreground");
    expect(layout).toContain("bg-background");
    expect(aiStudio).toContain("text-card-foreground");
    expect(aiStudio).toContain("focus:ring-ring");
  });
});
