import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, readTokens, resolveToken } from "../support/contrast";

const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
const light = readTokens(css, ":root");
const dark = readTokens(css, ".dark");

// Text tokens against the surfaces they are drawn on, each needing 4.5:1.
const TEXT_ON_SURFACE = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["foreground", "popover"],
  ["foreground", "muted"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["primary-foreground", "primary"],
  ["primary-foreground", "due-soon"],
  ["blue", "background"],
  ["blue", "card"],
  ["paid", "background"],
  ["paid", "card"],
  ["due-soon", "background"],
  ["due-soon", "card"],
  ["late", "background"],
  ["late", "card"],
  ["sidebar-foreground", "sidebar"],
  ["paid-on-dark", "sidebar"],
  ["late-on-dark", "sidebar"],
] as const;

function pair(layers: Record<string, string>[], text: string, surface: string): number {
  return contrastRatio(resolveToken(text, ...layers), resolveToken(surface, ...layers));
}

describe("the contrast helper", () => {
  it("gives 21 for black on white and 1 for the same colour", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#1f47c7", "#1f47c7")).toBeCloseTo(1, 5);
  });

  it("follows a token that names another", () => {
    expect(resolveToken("primary", { primary: "var(--blue)" }, { blue: "#1f47c7" })).toBe(
      "#1f47c7",
    );
  });
});

describe.each([
  ["light", [light]],
  ["dark", [dark, light]],
] as const)("the %s theme", (_name, layers) => {
  it.each(TEXT_ON_SURFACE)("keeps %s readable on %s", (text, surface) => {
    expect(pair([...layers], text, surface)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the two themes", () => {
  it("define the same text and surface tokens", () => {
    const onDark = ["paid-on-dark", "late-on-dark"];
    const wanted = new Set(TEXT_ON_SURFACE.flat().filter((name) => !onDark.includes(name)));
    for (const name of wanted) {
      expect(() => resolveToken(name, dark, light), name).not.toThrow();
    }
    expect(dark.foreground).not.toBe(light.foreground);
    expect(dark.card).not.toBe(light.card);
  });
});
