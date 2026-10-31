import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceFiles } from "../support/source-files";

const SRC_DIR = join(process.cwd(), "src");

describe("API routes", () => {
  it("has no route that answers from sample data", () => {
    const files = sourceFiles(join(SRC_DIR, "app", "api"));
    expect(files.some((file) => file.endsWith("route.ts"))).toBe(true);

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("x-dueline-stub");
    }
  });
});

describe("sample data", () => {
  it("is imported by nothing under src/lib or src/app", () => {
    const files = [...sourceFiles(join(SRC_DIR, "lib")), ...sourceFiles(join(SRC_DIR, "app"))];
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/from\s+["']@\/mocks|\/mocks\//);
    }
  });
});
