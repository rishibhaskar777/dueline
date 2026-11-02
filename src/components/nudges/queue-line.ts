import { reminderQueueItem } from "@/lib/automation/queue-items";
import type { QueueItem } from "@/types";
import type { Nudge } from "./use-nudges";

// The queue's text was written by the morning run, so its days late can be a day old. When the
// invoice is among today's nudges the line is built again from it; otherwise the stored text stays.
export function currentQueueItem(item: QueueItem, nudges: Nudge[]): QueueItem {
  if (item.kind !== "reminder" || item.invoiceId === null) return item;
  const nudge = nudges.find(({ invoice }) => invoice.id === item.invoiceId);
  if (!nudge) return item;
  const current = reminderQueueItem(nudge.invoice, nudge.draft.reason);
  return { ...item, title: current.title, detail: current.detail };
}
