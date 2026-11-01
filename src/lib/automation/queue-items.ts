import { formatMoney } from "@/lib/money/format";
import type { InvoiceSummary, QueueItem, RepeatSchedule } from "@/types";

function dayCount(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

// One item per invoice, so each daily run can swap the old list for the current one.
export function reminderQueueItem(invoice: InvoiceSummary, reason: string): QueueItem {
  return {
    id: `reminder.${invoice.id}`,
    kind: "reminder",
    title: `Remind ${invoice.client.name} about ${invoice.number}`,
    detail: `${formatMoney(invoice.amount)}, ${dayCount(invoice.daysLate)} late. ${reason} A draft is ready to review.`,
    invoiceId: invoice.id,
    repeatId: null,
  };
}

// The ID ends with the date it was due, so a run that is repeated adds nothing.
export function repeatQueueItem(repeat: RepeatSchedule): QueueItem {
  const items = repeat.items.length === 1 ? "1 item" : `${repeat.items.length} items`;
  return {
    id: `repeat.${repeat.id}.${repeat.nextOn}`,
    kind: "repeat",
    title: `Retainer for ${repeat.clientName} is ready to send`,
    detail: `${items} in ${repeat.currency}, due on day ${repeat.dayOfMonth} of the month. Review it on New invoice.`,
    invoiceId: null,
    repeatId: repeat.id,
  };
}
