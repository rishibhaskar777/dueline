import type { InvoiceSummary } from "@/types";

export type StatusFilter = "all" | "overdue" | "due_soon" | "unpaid" | "paid";

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "due_soon", label: "Due soon" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
];

type StatusCounts = Record<StatusFilter, number>;

function matches(invoice: InvoiceSummary, filter: StatusFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unpaid":
      return invoice.dueState !== "paid";
    default:
      return invoice.dueState === filter;
  }
}

export function filterByStatus(invoices: InvoiceSummary[], filter: StatusFilter): InvoiceSummary[] {
  return invoices.filter((invoice) => matches(invoice, filter));
}

// The grid's own search box looks in the same fields; a list of cards needs the same rule.
export function searchInvoices(invoices: InvoiceSummary[], search: string): InvoiceSummary[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return invoices;
  return invoices.filter((invoice) => {
    const haystack = [
      invoice.number,
      invoice.client.name,
      invoice.work,
      invoice.issuedOn,
      invoice.dueOn,
      invoice.purposeCode ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

export function countByStatus(invoices: InvoiceSummary[]): StatusCounts {
  return Object.fromEntries(
    STATUS_FILTERS.map(({ value }) => [value, filterByStatus(invoices, value).length]),
  ) as StatusCounts;
}

const STATE_RANK: Record<InvoiceSummary["dueState"], number> = {
  overdue: 0,
  due_soon: 1,
  on_time: 2,
  paid: 3,
};

function compareWithinState(a: InvoiceSummary, b: InvoiceSummary): number {
  switch (a.dueState) {
    case "overdue":
      return b.daysLate - a.daysLate;
    case "paid":
      return (b.paidOn ?? "").localeCompare(a.paidOn ?? "");
    default:
      return a.dueOn.localeCompare(b.dueOn);
  }
}

// Overdue (most days late first), due soon, other unpaid by due date, then paid (latest first);
// the number breaks ties so the order is stable.
export function sortForTable(invoices: InvoiceSummary[]): InvoiceSummary[] {
  return [...invoices].sort(
    (a, b) =>
      STATE_RANK[a.dueState] - STATE_RANK[b.dueState] ||
      compareWithinState(a, b) ||
      a.number.localeCompare(b.number),
  );
}
