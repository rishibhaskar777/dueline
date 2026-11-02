import { describe, expect, it } from "vitest";
import { addDays, daysBetween } from "@/lib/date-math";
import { buildDemoStory, RESEED_AFTER_DAYS } from "@/lib/demo/story";

const DUE_SOON_DAYS = 3;
const NUDGE_AFTER_DAYS = 1;

// What Home, Nudges and the export register show for a story that was seeded `age` days ago.
function viewOn(day: string, age: number) {
  const story = buildDemoStory(addDays(day, -age));
  const unpaid = story.filter((invoice) => invoice.paidOn === null);
  const paid = story.filter((invoice) => invoice.paidOn !== null);
  return {
    dueSoon: unpaid.filter((i) => i.dueOn >= day && daysBetween(day, i.dueOn) <= DUE_SOON_DAYS),
    late: unpaid.filter((i) => daysBetween(i.dueOn, day) >= NUDGE_AFTER_DAYS),
    paid,
    latestPaidMonth:
      paid
        .map((i) => i.paidOn?.slice(0, 7) ?? "")
        .sort()
        .at(-1) ?? null,
  };
}

describe("the demo story through the judging period", () => {
  it("is built relative to the day it is seeded, for 1 and 15 December", () => {
    for (const day of ["2026-12-01", "2026-12-15"]) {
      const view = viewOn(day, 0);
      expect(view.dueSoon.length).toBeGreaterThanOrEqual(1);
      expect(view.late.length).toBeGreaterThanOrEqual(2);
      expect(view.paid.length).toBeGreaterThanOrEqual(1);
      expect(view.latestPaidMonth).not.toBeNull();
    }
  });

  it("still shows due soon, late and paid invoices on every day of its life", () => {
    for (let dayOfMonth = 1; dayOfMonth <= 15; dayOfMonth += 1) {
      const day = `2026-12-${String(dayOfMonth).padStart(2, "0")}`;
      for (let age = 0; age < RESEED_AFTER_DAYS; age += 1) {
        const view = viewOn(day, age);
        const where = `${day}, seeded ${age} days earlier`;
        expect(view.dueSoon.length, `due soon, ${where}`).toBeGreaterThanOrEqual(1);
        expect(view.late.length, `late, ${where}`).toBeGreaterThanOrEqual(2);
        expect(view.paid.length, `paid, ${where}`).toBeGreaterThanOrEqual(1);
        expect(view.latestPaidMonth, `register, ${where}`).not.toBeNull();
      }
    }
  });
});
