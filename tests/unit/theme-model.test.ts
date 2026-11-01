import { describe, expect, it } from "vitest";
import { initialTheme, nextTheme, revealRadius } from "@/components/layout/theme-model";

describe("initialTheme", () => {
  it("uses the stored choice over the device", () => {
    expect(initialTheme("light", true)).toBe("light");
    expect(initialTheme("dark", false)).toBe("dark");
  });

  it("follows the device when nothing is stored", () => {
    expect(initialTheme(null, true)).toBe("dark");
    expect(initialTheme(null, false)).toBe("light");
  });

  it("ignores a stored value that is not a theme, such as the old 'system'", () => {
    expect(initialTheme("system", true)).toBe("dark");
    expect(initialTheme("", false)).toBe("light");
  });
});

describe("nextTheme", () => {
  it("swaps one for the other", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });
});

describe("revealRadius", () => {
  it("reaches the corner farthest from the button", () => {
    expect(revealRadius(0, 0, 300, 400)).toBe(500);
    expect(revealRadius(300, 400, 300, 400)).toBe(500);
    expect(revealRadius(100, 100, 300, 400)).toBeCloseTo(Math.hypot(200, 300));
  });

  it("is half the diagonal from the centre", () => {
    expect(revealRadius(150, 200, 300, 400)).toBe(250);
  });

  it("still covers the screen when the button is outside the viewport", () => {
    expect(revealRadius(-50, 0, 300, 400)).toBeGreaterThanOrEqual(Math.hypot(350, 400));
  });
});
