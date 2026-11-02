import { describe, expect, it } from "vitest";
import { initialTheme, nextTheme } from "@/components/layout/theme-model";

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
