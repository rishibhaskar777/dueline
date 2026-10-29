import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("vercel.json", () => {
  it("pins functions to Singapore, next to the database", () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as {
      regions?: unknown;
    };
    expect(config.regions).toEqual(["sin1"]);
  });
});
