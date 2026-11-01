import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceFiles } from "../support/source-files";

const API_DIR = join(process.cwd(), "src", "app", "api");

// Reads only a list written in the code, so it is prerendered at build time.
const STATIC_GETS = ["purpose-codes"];

const routes = sourceFiles(API_DIR)
  .filter((file) => file.endsWith("route.ts"))
  .map((file) => ({
    name: file
      .slice(API_DIR.length + 1)
      .replace(/[\\/]route\.ts$/, "")
      .replaceAll("\\", "/"),
    source: readFileSync(file, "utf8"),
  }))
  .filter(({ source }) => /export async function GET\b/.test(source));

describe("GET routes", () => {
  it("are found", () => {
    expect(routes.length).toBeGreaterThan(20);
  });

  it("wait for a request before reading anything, except the fixed purpose-code list", () => {
    for (const { name, source } of routes) {
      const waits = source.includes("await connection()");
      expect(waits, name).toBe(!STATIC_GETS.includes(name));
    }
  });

  it("never set route segment config, which fails the build with Cache Components", () => {
    for (const { name, source } of routes) {
      expect(source, name).not.toMatch(/export const (dynamic|revalidate|fetchCache)\b/);
    }
  });

  it("keep the static routes free of stores, PayPal and the clock", () => {
    for (const name of STATIC_GETS) {
      const source = routes.find((route) => route.name === name)?.source ?? "";
      expect(source, name).not.toMatch(/@\/lib\/(store|paypal|clock|settings|profile)/);
    }
  });
});
