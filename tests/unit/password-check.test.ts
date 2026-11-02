import { describe, expect, it } from "vitest";
import { checkPassword } from "@/components/demo/password-check";

describe("checkPassword", () => {
  it("asks for the password when the field is empty", () => {
    expect(checkPassword("")).toBe("Enter the demo password.");
  });

  it("accepts any text, leaving the right-or-wrong decision to the server", () => {
    expect(checkPassword("x")).toBeNull();
    expect(checkPassword(" ")).toBeNull();
  });
});
