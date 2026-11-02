import { formatRupees } from "@/lib/money/format";
import type { InvoiceSummary, Totals } from "@/types";

export function openInvoiceCount(invoices: InvoiceSummary[]): number {
  return invoices.filter((invoice) => invoice.dueState !== "paid").length;
}

export function invoiceCount(count: number): string {
  return `${count} ${count === 1 ? "invoice" : "invoices"}`;
}

export function paidNote(totals: Totals): string {
  const bank =
    totals.paidLast30OutsideInr > 0
      ? ` · ${formatRupees(totals.paidLast30OutsideInr)} by bank`
      : "";
  return `${formatRupees(totals.paidLast30PayPalInr)} through PayPal${bank}`;
}
