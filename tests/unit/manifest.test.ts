import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("the web app manifest", () => {
  const result = manifest();

  it("names the app and opens it on Receivables in its own window", () => {
    expect(result).toMatchObject({
      name: "Dueline",
      start_url: "/receivables",
      display: "standalone",
      theme_color: "#0D1B2E",
    });
  });

  it("points to icon files that exist, including a maskable one", () => {
    expect(result.icons?.length).toBeGreaterThanOrEqual(3);
    for (const icon of result.icons ?? []) {
      expect(existsSync(join(process.cwd(), "public", icon.src)), icon.src).toBe(true);
    }
    expect(result.icons?.some((icon) => icon.purpose === "maskable")).toBe(true);
    expect(existsSync(join(process.cwd(), "public", "apple-touch-icon.png"))).toBe(true);
  });
});
