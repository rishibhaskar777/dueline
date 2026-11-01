import "server-only";
import { loadVisibleInvoices } from "@/lib/demo/visible-invoices";
import { todayInKolkata } from "@/lib/date-math";
import { getStore } from "@/lib/store";
import type { QueueItem } from "@/types";
import { QueueItemNotFoundError } from "./errors";

// Runs are counted by the real India day, not by the demo clock's date.
export function queueDay(now: Date = new Date()): string {
  return todayInKolkata(now);
}

// A reminder item is only worth showing while its invoice is shown and still overdue. One that is not
// (cancelled, paid, hidden, or from an older story) is deleted as it is found, so every count agrees.
export async function listQueue(): Promise<QueueItem[]> {
  const store = getStore();
  const [items, loaded] = await Promise.all([store.listQueue(), loadVisibleInvoices()]);
  const overdue = new Set(
    loaded.filter(({ summary }) => summary.dueState === "overdue").map(({ summary }) => summary.id),
  );
  const stale = items.filter(({ invoiceId }) => invoiceId !== null && !overdue.has(invoiceId));
  await Promise.all(stale.map(({ id }) => store.removeQueueItem(id)));
  return items.filter((item) => !stale.includes(item));
}

// A reminder item comes back with the next daily run if the invoice is still overdue; a retainer
// item does not, because its schedule has already moved on.
export async function dismissQueueItem(id: string): Promise<void> {
  if (!(await getStore().removeQueueItem(id))) throw new QueueItemNotFoundError();
}
