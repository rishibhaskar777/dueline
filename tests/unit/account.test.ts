import { describe, expect, it } from "vitest";
import { accountLabel, initialsOf } from "@/components/layout/account";

describe("initialsOf", () => {
  it("takes the first letters of the first and last word", () => {
    expect(initialsOf("Riya Sharma")).toBe("RS");
    expect(initialsOf("riya kumari sharma")).toBe("RS");
  });

  it("gives one letter for a one-word name", () => {
    expect(initialsOf("Riya")).toBe("R");
  });

  it("ignores extra spaces", () => {
    expect(initialsOf("  Riya   Sharma  ")).toBe("RS");
  });

  it("gives null for an empty name", () => {
    expect(initialsOf("")).toBeNull();
    expect(initialsOf("   ")).toBeNull();
  });
});

describe("accountLabel", () => {
  it("names the person, or just the menu when there is no name", () => {
    expect(accountLabel("Riya Sharma", 0)).toBe("Account menu for Riya Sharma");
    expect(accountLabel("", 0)).toBe("Account menu");
  });

  it("ends with the number of rate alerts when there are any", () => {
    expect(accountLabel("Riya Sharma", 1)).toBe("Account menu for Riya Sharma, 1 rate alert");
    expect(accountLabel("Riya Sharma", 2)).toBe("Account menu for Riya Sharma, 2 rate alerts");
    expect(accountLabel("", 2)).toBe("Account menu, 2 rate alerts");
  });
});
