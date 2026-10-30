import { describe, expect, it } from "vitest";
import { maskContacts, unmask } from "@/lib/privacy/mask";

describe("maskContacts", () => {
  it("replaces each distinct email with its own placeholder", () => {
    const result = maskContacts(
      "Write to mike@haldencoffee.example or Ana.Lopez@studio.co.uk today",
    );
    expect(result.masked).toBe("Write to [EMAIL_1] or [EMAIL_2] today");
    expect(result.emails).toEqual(["mike@haldencoffee.example", "Ana.Lopez@studio.co.uk"]);
    expect(result.phones).toEqual([]);
  });

  it("gives a repeated email the same placeholder, whatever its case", () => {
    const result = maskContacts("a@x.example, then A@X.example, then b@x.example.");
    expect(result.masked).toBe("[EMAIL_1], then [EMAIL_1], then [EMAIL_2].");
    expect(result.emails).toEqual(["a@x.example", "b@x.example"]);
  });

  it("masks Indian phone numbers", () => {
    const result = maskContacts("Call +91 98765 43210 or 98765-43210 or 09876543210.");
    expect(result.masked).toBe("Call [PHONE_1] or [PHONE_2] or [PHONE_3].");
    expect(result.phones).toEqual(["+91 98765 43210", "98765-43210", "09876543210"]);
  });

  it("masks US phone numbers", () => {
    const result = maskContacts("Mine is (415) 555-2671, office 415.555.0199, or +1 415 555 2671.");
    expect(result.masked).toBe("Mine is [PHONE_1], office [PHONE_2], or [PHONE_3].");
    expect(result.phones).toHaveLength(3);
  });

  it("gives the same number the same placeholder however it is written", () => {
    const result = maskContacts("Call 415-555-2671 or 415 555 2671.");
    expect(result.masked).toBe("Call [PHONE_1] or [PHONE_1].");
    expect(result.phones).toEqual(["415-555-2671"]);
  });

  it("leaves money, dates and times alone", () => {
    const text =
      "3 logos at $120 each, 1,200.00 in total, ₹35,725 after fees, USD 1234567.89 for the lot. " +
      "Due 30/10/2026 or 2026-10-30, call at 10:30 or 4.30 pm.";
    const result = maskContacts(text);
    expect(result.masked).toBe(text);
    expect(result.emails).toEqual([]);
    expect(result.phones).toEqual([]);
  });

  it("still finds a phone number written next to a date", () => {
    const result = maskContacts("Due 2026-10-30, ring 98765 43210.");
    expect(result.masked).toBe("Due 2026-10-30, ring [PHONE_1].");
  });

  it("returns text without contacts unchanged", () => {
    expect(maskContacts("Need 3 logos by Friday.")).toEqual({
      masked: "Need 3 logos by Friday.",
      emails: [],
      phones: [],
    });
  });
});

describe("unmask", () => {
  it("restores placeholders in any string", () => {
    const map = maskContacts("mike@haldencoffee.example, +91 98765 43210");
    expect(unmask("Send to [EMAIL_1] (phone [PHONE_1])", map)).toBe(
      "Send to mike@haldencoffee.example (phone +91 98765 43210)",
    );
  });

  it("leaves a placeholder it does not know", () => {
    expect(unmask("[EMAIL_2] and [PHONE_1]", { emails: ["a@x.example"], phones: [] })).toBe(
      "[EMAIL_2] and [PHONE_1]",
    );
  });
});
