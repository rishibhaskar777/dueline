import { describe, expect, it } from "vitest";
import {
  DEFAULT_AXIS_PX,
  layoutDueLine,
  MAX_DUE_LINE_ROWS,
  MIN_LINE_PX,
} from "@/components/receivables/due-line-layout";
import { haldenLabelsInvoice, tandemInvoice } from "@/mocks/fixtures";
import type { InvoiceSummary } from "@/types";

function invoice(overrides: Partial<InvoiceSummary>): InvoiceSummary {
  return { ...tandemInvoice, ...overrides };
}

describe("layoutDueLine", () => {
  it("runs the axis from the earliest issue date to the latest date plus three days", () => {
    const layout = layoutDueLine(
      [
        invoice({ id: "a", issuedOn: "2026-10-01", dueOn: "2026-10-15" }),
        invoice({ id: "b", issuedOn: "2026-10-10", dueOn: "2026-10-31" }),
      ],
      "2026-10-20",
      false,
    );
    // 1 Oct to 3 Nov is 33 days.
    expect(layout.today).toBeCloseTo(19 / 33);
    expect(layout.ticks.map((tick) => tick.date)).toEqual([
      "2026-10-01",
      "2026-10-08",
      "2026-10-15",
      "2026-10-22",
      "2026-10-29",
    ]);
    expect(layout.ticks[0].position).toBe(0);
  });

  it("draws a paid-on-time invoice in the paid colour with a filled end", () => {
    const [row] = layoutDueLine([haldenLabelsInvoice], "2026-10-30", false).rows;
    expect(row.segments).toHaveLength(1);
    expect(row.segments[0].tone).toBe("paid");
    expect(row.endMark).toBe("filled");
    expect(row.statusText).toBe("Paid");
    expect(row.accessibleName).toBe("Halden Coffee Co., $450.00, paid 15 Oct 2026");
  });

  it("turns the part after the due date late when an invoice was paid late", () => {
    const [row] = layoutDueLine(
      [
        invoice({
          dueState: "paid",
          issuedOn: "2026-10-01",
          dueOn: "2026-10-10",
          paidOn: "2026-10-15",
        }),
      ],
      "2026-10-30",
      false,
    ).rows;
    expect(row.segments.map((segment) => segment.tone)).toEqual(["paid", "late"]);
    expect(row.segments[0].to).toBe(row.segments[1].from);
    expect(row.endTone).toBe("late");
    expect(row.statusTone).toBe("paid");
  });

  it("runs an overdue invoice to today, blue then late, with an open end", () => {
    const [row] = layoutDueLine(
      [invoice({ dueState: "overdue", issuedOn: "2026-10-01", dueOn: "2026-10-10", daysLate: 5 })],
      "2026-10-15",
      false,
    ).rows;
    expect(row.segments.map((segment) => segment.tone)).toEqual(["blue", "late"]);
    expect(row.segments[1].to).toBe(row.end);
    expect(row.endMark).toBe("open");
    expect(row.statusText).toBe("5 days late");
  });

  it("uses the due-soon colour for the whole line", () => {
    const [row] = layoutDueLine(
      [invoice({ dueState: "due_soon", issuedOn: "2026-10-01", dueOn: "2026-10-17" })],
      "2026-10-15",
      false,
    ).rows;
    expect(row.segments.map((segment) => segment.tone)).toEqual(["due_soon"]);
    expect(row.statusText).toBe("Due in 2 days");
  });

  it("says due today on the due date", () => {
    const [row] = layoutDueLine(
      [invoice({ dueState: "due_soon", issuedOn: "2026-10-01", dueOn: "2026-10-15" })],
      "2026-10-15",
      false,
    ).rows;
    expect(row.statusText).toBe("Due today");
    expect(row.due).toBe(row.end);
  });

  it("uses singular wording for one day", () => {
    const [soon] = layoutDueLine(
      [invoice({ dueState: "due_soon", dueOn: "2026-10-16" })],
      "2026-10-15",
      false,
    ).rows;
    const [late] = layoutDueLine(
      [invoice({ dueState: "overdue", dueOn: "2026-10-14" })],
      "2026-10-15",
      false,
    ).rows;
    expect(soon.statusText).toBe("Due in 1 day");
    expect(late.statusText).toBe("1 day late");
  });

  it("names an unpaid invoice with its due date and how far away it is", () => {
    const [row] = layoutDueLine(
      [
        invoice({
          client: { ...tandemInvoice.client, name: "Halden Coffee Co." },
          amount: { currency: "USD", value: "441.00" },
          issuedOn: "2026-10-30",
          dueOn: "2026-11-13",
        }),
      ],
      "2026-10-30",
      false,
    ).rows;
    expect(row.accessibleName).toBe("Halden Coffee Co., $441.00, due 13 Nov 2026, due in 14 days");
  });

  it("lays out a single invoice", () => {
    const layout = layoutDueLine(
      [invoice({ issuedOn: "2026-10-30", dueOn: "2026-10-30" })],
      "2026-10-30",
      false,
    );
    expect(layout.rows).toHaveLength(1);
    expect(layout.today).toBe(0);
  });

  it("counts days across a month end", () => {
    const [row] = layoutDueLine(
      [invoice({ dueState: "on_time", issuedOn: "2026-10-28", dueOn: "2026-11-11" })],
      "2026-11-02",
      false,
    ).rows;
    // 28 Oct to 14 Nov is 17 days.
    expect(row.due).toBeCloseTo(14 / 17);
    expect(row.end).toBeCloseTo(5 / 17);
  });

  it("shows the newest 12 invoices first and can show them all", () => {
    const many = Array.from({ length: 15 }, (_, index) =>
      invoice({
        id: `inv-${index}`,
        number: `INV-${index}`,
        issuedOn: `2026-10-${String(index + 1).padStart(2, "0")}`,
        dueOn: "2026-11-20",
      }),
    );
    const limited = layoutDueLine(many, "2026-10-30", false);
    expect(limited.rows).toHaveLength(MAX_DUE_LINE_ROWS);
    expect(limited.rows[0].invoice.id).toBe("inv-14");
    expect(limited.total).toBe(15);

    const all = layoutDueLine(many, "2026-10-30", true);
    expect(all.rows).toHaveLength(15);
  });

  it("returns an empty layout without invoices", () => {
    expect(layoutDueLine([], "2026-10-30", false)).toEqual({
      today: 0,
      ticks: [],
      rows: [],
      total: 0,
    });
  });

  it("gives an unpaid invoice issued and due today a line of at least 8 px", () => {
    const [row] = layoutDueLine(
      [invoice({ dueState: "due_soon", issuedOn: "2026-10-30", dueOn: "2026-10-30" })],
      "2026-10-30",
      false,
      600,
    ).rows;
    expect(row.end - row.segments[0].from).toBeCloseTo(MIN_LINE_PX / 600);
    expect(row.segments[0].to).toBe(row.end);
  });

  it("scales the minimum with the measured width and leaves longer lines alone", () => {
    const sameDay = invoice({ dueState: "on_time", issuedOn: "2026-10-30", dueOn: "2026-11-20" });
    const [narrow] = layoutDueLine([sameDay], "2026-10-30", false, 400).rows;
    const [wide] = layoutDueLine([sameDay], "2026-10-30", false, 800).rows;
    expect(narrow.end).toBeCloseTo(8 / 400);
    expect(wide.end).toBeCloseTo(8 / 800);

    const [long] = layoutDueLine(
      [invoice({ dueState: "on_time", issuedOn: "2026-10-01", dueOn: "2026-11-20" })],
      "2026-10-30",
      false,
      DEFAULT_AXIS_PX,
    ).rows;
    expect(long.end).toBeCloseTo(long.segments[0].to);
    expect(long.end * DEFAULT_AXIS_PX).toBeGreaterThan(MIN_LINE_PX);
  });
});
