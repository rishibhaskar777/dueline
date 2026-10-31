import { describe, expect, it } from "vitest";
import { describeReset } from "@/components/demo/reset-summary";

describe("describeReset", () => {
  it("counts what was cancelled, deleted, created and left in place", () => {
    expect(
      describeReset({ cancelled: 2, deleted: 1, created: 7, skipped: 1, failed: 0, kept: 0 }),
    ).toBe(
      "Demo reset: 2 invoices cancelled, 1 draft deleted, 7 sample invoices created, 1 already in place.",
    );
  });

  it("says when sample invoices could not be created", () => {
    expect(
      describeReset({ cancelled: 0, deleted: 0, created: 7, skipped: 0, failed: 1, kept: 0 }),
    ).toBe(
      "Demo reset: 0 invoices cancelled, 0 drafts deleted, 7 sample invoices created, 0 already in place. 1 sample invoice could not be created. Reset again in ten minutes.",
    );
  });

  it("says how many recent invoices were left alone", () => {
    expect(
      describeReset({ cancelled: 1, deleted: 0, created: 0, skipped: 8, failed: 0, kept: 2 }),
    ).toBe(
      "Demo reset: 1 invoice cancelled, 0 drafts deleted, 0 sample invoices created, 8 already in place. 2 recent invoices kept: created in the last 30 minutes.",
    );
  });
});
