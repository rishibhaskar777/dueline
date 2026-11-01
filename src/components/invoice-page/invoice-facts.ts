import { daysBetween } from "@/lib/date-math";
import { formatDate } from "@/lib/format-date";
import { formatDays } from "@/lib/format-days";
import type { InvoiceSummary } from "@/types";

// "Due 15 Aug 2026 · 3 days late", "Due 15 Aug 2026 · due in 4 days" or the paid date.
export function dueSentence(invoice: InvoiceSummary, today: string): string {
  const due = formatDate(invoice.dueOn);
  if (invoice.dueState === "paid") {
    return invoice.paidOn ? `${due} · paid ${formatDate(invoice.paidOn)}` : due;
  }
  if (invoice.dueState === "overdue") return `${due} · ${formatDays(invoice.daysLate)} late`;
  const left = daysBetween(today, invoice.dueOn);
  if (left <= 0) return `${due} · due today`;
  return `${due} · due in ${formatDays(left)}`;
}

const LUT_ARN = /LUT ARN: ([A-Za-z0-9]{15})/;

// The ARN is read from the note printed on the invoice, where Dueline wrote it.
export function lutSentence(underLut: boolean, note: string): string {
  if (!underLut) return "Not under LUT";
  const arn = LUT_ARN.exec(note)?.[1];
  return arn ? `Under LUT · ARN ${arn}` : "Under LUT · no ARN on this invoice";
}
