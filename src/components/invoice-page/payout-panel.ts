import { rateNote } from "@/components/receivables/invoice-status";
import type { InvoiceSummary } from "@/types";

export interface PayoutPanel {
  label: string;
  rupees: number;
  note: string;
}

// The blue panel beside the amount: what reaches, or reached, the bank and where that figure comes
// from. Null when there is no figure yet or the invoice is cancelled.
export function payoutPanel(invoice: InvoiceSummary): PayoutPanel | null {
  if (invoice.payoutInr === null || invoice.paypalStatus === "CANCELLED") return null;
  const rate = rateNote(invoice);
  const note =
    invoice.payoutSource === "paypal"
      ? "PayPal's own figure"
      : invoice.payoutSource === "outside_paypal"
        ? `${rate ? `${rate}, ` : ""}paid outside PayPal, so no PayPal fee`
        : `${rate ? `${rate}, ` : "Estimate, "}after PayPal's fee`;
  return {
    label: invoice.dueState === "paid" ? "Reached your bank" : "Reaches your bank, about",
    rupees: invoice.payoutInr,
    note,
  };
}
