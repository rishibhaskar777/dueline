import { describe, expect, it } from "vitest";
import {
  countByStatus,
  filterByStatus,
  sortForTable,
} from "@/components/receivables/invoice-table-model";
import { invoices } from "@/mocks/fixtures";
import type { InvoiceSummary } from "@/types";

describe("invoice table model", () => {
  it("counts every status filter", () => {
    expect(countByStatus(invoices)).toEqual({
      all: 6,
      overdue: 2,
      due_soon: 1,
      unpaid: 4,
      paid: 2,
    });
  });

  it("filters by status", () => {
    expect(filterByStatus(invoices, "overdue").map((i) => i.number)).toEqual([
      "INV-0043",
      "INV-0044",
    ]);
    expect(filterByStatus(invoices, "unpaid")).toHaveLength(4);
    expect(filterByStatus(invoices, "paid").every((i) => i.dueState === "paid")).toBe(true);
    expect(filterByStatus(invoices, "all")).toHaveLength(6);
  });

  it("sorts overdue, then due soon, then other unpaid, then paid", () => {
    expect(sortForTable(invoices).map((i) => i.number)).toEqual([
      "INV-0044",
      "INV-0043",
      "INV-0045",
      "INV-0046",
      "INV-0042",
      "INV-0041",
    ]);
  });

  it("puts the most days late first, and the latest payment first among paid", () => {
    const [base] = invoices;
    if (!base) throw new Error("fixtures are empty");
    const make = (number: string, fields: Partial<InvoiceSummary>): InvoiceSummary => ({
      ...base,
      number,
      ...fields,
    });
    const rows = [
      make("A", { dueState: "paid", paidOn: "2026-10-01" }),
      make("B", { dueState: "overdue", daysLate: 2 }),
      make("C", { dueState: "paid", paidOn: "2026-10-20" }),
      make("D", { dueState: "overdue", daysLate: 9 }),
      make("E", { dueState: "on_time", dueOn: "2026-11-30" }),
      make("F", { dueState: "on_time", dueOn: "2026-11-02" }),
    ];
    expect(sortForTable(rows).map((i) => i.number)).toEqual(["D", "B", "F", "E", "C", "A"]);
  });

  it("does not change the list it is given", () => {
    const before = invoices.map((i) => i.id);
    sortForTable(invoices);
    expect(invoices.map((i) => i.id)).toEqual(before);
  });
});
