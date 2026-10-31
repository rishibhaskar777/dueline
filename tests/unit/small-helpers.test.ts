import { describe, expect, it } from "vitest";
import { NO_CODE, purposeCodeItems } from "@/components/invoices/purpose-code-items";
import { eventWhen } from "@/components/receivables/activity-text";
import { basisNote } from "@/components/shared/risk-basis";

describe("basisNote", () => {
  it("says how few invoices a rating rests on", () => {
    expect(basisNote({ invoicesConsidered: 1 })).toBe("Based on 1 invoice.");
    expect(basisNote({ invoicesConsidered: 3 })).toBe("Based on 3 invoices.");
  });

  it("says nothing from four invoices up, or with none", () => {
    expect(basisNote({ invoicesConsidered: 4 })).toBeNull();
    expect(basisNote({ invoicesConsidered: 0 })).toBeNull();
  });
});

describe("purposeCodeItems", () => {
  const codes = [{ code: "P1099", label: "Other business services", examples: "" }];

  it("puts the no-code choice first and labels each code", () => {
    expect(purposeCodeItems(codes)).toEqual([
      { value: NO_CODE, label: "No purpose code" },
      { value: "P1099", label: "P1099 Other business services" },
    ]);
  });
});

describe("eventWhen", () => {
  const NOW = Date.parse("2026-10-30T10:00:00Z");

  it("reads recent events relatively", () => {
    expect(eventWhen("2026-10-30T08:00:00Z", "2026-10-30", NOW)).toBe("2 hours ago");
    expect(eventWhen("2026-10-24T08:00:00Z", "2026-10-30", NOW)).toBe("6 days ago");
  });

  it("gives the date of an event a week or more old, in India time", () => {
    expect(eventWhen("2026-08-15T03:30:00Z", "2026-10-30", NOW)).toBe("15 Aug");
    expect(eventWhen("2026-10-23T03:30:00Z", "2026-10-30", NOW)).toBe("23 Oct");
  });
});
