import { describe, expect, it } from "vitest";
import { dueDateIn, dueDateInNote, restatesDueTerms } from "@/lib/ai/due-terms";

const TODAY = "2026-11-04";

describe("dueDateIn", () => {
  it.each([
    ["Terms: net 15. Billing contact is billing@example.com.", "2026-11-19"],
    ["Payment net 7 rakhte hain, ok?", "2026-11-11"],
    ["Payment net-30 please", "2026-12-04"],
    ["Payment in 15 days is fine for us", "2026-11-19"],
    ["Please pay within 10 days", "2026-11-14"],
    ["The invoice is due in 5 days", "2026-11-09"],
    ["Our finance team: payment due on 2026-12-05", "2026-12-05"],
  ])("reads the due date from %j", (chat, expected) => {
    expect(dueDateIn(chat, TODAY)).toBe(expected);
  });

  it("finds nothing in a chat that gives a delivery date or no terms", () => {
    expect(dueDateIn("Sprites delivered by Friday the 30th", TODAY)).toBeNull();
    expect(dueDateIn("Call me in 3 days about the logo", TODAY)).toBeNull();
  });

  it.each([
    "I can finish within 3 days",
    "Delivery in 5 days",
    "I'll send the files in 2 days",
    "Revisions within 7 days",
    "Logo in 4 days. Payment comes later.",
    "Deliver in 5 days\nPlease invoice us",
  ])("does not take the work wording %j as a due date", (chat) => {
    expect(dueDateIn(chat, TODAY)).toBeNull();
  });

  it("takes a day count from the payment sentence, not the delivery one", () => {
    expect(dueDateIn("I can finish within 3 days. We pay within 10 days.", TODAY)).toBe(
      "2026-11-14",
    );
  });

  it("counts net terms and payment words in any line", () => {
    expect(dueDateIn("Files in 2 days\nnet 30 is fine", TODAY)).toBe("2026-12-04");
    expect(dueDateIn("Hum payment kar denge within 7 days", TODAY)).toBe("2026-11-11");
    expect(dueDateIn("Money will be transferred in 12 days", TODAY)).toBe("2026-11-16");
  });
});

describe("dueDateInNote", () => {
  it("reads a bare number of days as well as the chat's forms", () => {
    expect(dueDateInNote("15 days", TODAY)).toBe("2026-11-19");
    expect(dueDateInNote("Net 30", TODAY)).toBe("2026-12-04");
    expect(dueDateInNote("after approval", TODAY)).toBeNull();
  });
});

describe("restatesDueTerms", () => {
  it.each(["Net 15", "net 7", "Payment in 15 days", "15 days from invoice", "due on 2026-12-05"])(
    "treats %j as only a due date",
    (note) => {
      expect(restatesDueTerms(note, TODAY)).toBe(true);
    },
  );

  it.each(["after approval", "Net 30, after client approval", "Milestone based"])(
    "keeps %j, which says more",
    (note) => {
      expect(restatesDueTerms(note, TODAY)).toBe(false);
    },
  );
});
