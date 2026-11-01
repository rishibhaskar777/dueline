import { addDays } from "@/lib/date-math";
import type { DailyDigest, DigestInvoice, InvoiceSummary, TriggeredRateAlert } from "@/types";

// "Newly overdue" means up to this many days late.
const NEWLY_OVERDUE_DAYS = 3;

function digestInvoice({ id, number, client, amount }: InvoiceSummary): DigestInvoice {
  return { invoiceId: id, invoiceNumber: number, clientName: client.name, amount };
}

interface DigestInput {
  day: string;
  invoices: readonly InvoiceSummary[];
  preparedDrafts: number;
  rateAlerts: TriggeredRateAlert[];
}

export function buildDigest({
  day,
  invoices,
  preparedDrafts,
  rateAlerts,
}: DigestInput): DailyDigest {
  const yesterday = addDays(day, -1);
  const pick = (keep: (invoice: InvoiceSummary) => boolean): DigestInvoice[] =>
    invoices.filter(keep).map(digestInvoice);

  return {
    day,
    paidSinceYesterday: pick(
      ({ dueState, paidOn }) => dueState === "paid" && paidOn !== null && paidOn >= yesterday,
    ),
    newlyOverdue: pick(
      ({ dueState, daysLate }) => dueState === "overdue" && daysLate <= NEWLY_OVERDUE_DAYS,
    ),
    dueSoon: pick(({ dueState }) => dueState === "due_soon"),
    preparedDrafts,
    rateAlerts,
  };
}
