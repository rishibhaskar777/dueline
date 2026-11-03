import { describe, expect, it } from "vitest";
import { mergeSentence } from "@/components/clients/merge-text";
import { displayEmail } from "@/lib/sandbox-buyer";

describe("displayEmail", () => {
  it("names a PayPal sandbox buyer instead of showing its generated address", () => {
    expect(displayEmail("sb-s471e753484744@personal.example.com")).toBe("PayPal sandbox buyer");
    expect(displayEmail("Buyer@Personal.Example.com")).toBe("PayPal sandbox buyer");
  });

  it("shows every other address as it is", () => {
    expect(displayEmail("maya@example.com")).toBe("maya@example.com");
    expect(displayEmail("a@personal.example.com.au")).toBe("a@personal.example.com.au");
  });
});

describe("a screen sentence that shows an address", () => {
  it("uses the label for a sandbox buyer and the address for anyone else", () => {
    const into = { name: "Kraftwerk Studio" };
    expect(
      mergeSentence({ name: "Kraftwerk", email: "sb-1@personal.example.com" }, into),
    ).toContain("Kraftwerk (PayPal sandbox buyer)");
    expect(mergeSentence({ name: "Kraftwerk", email: "lena@kraftwerk.example" }, into)).toContain(
      "Kraftwerk (lena@kraftwerk.example)",
    );
  });
});
