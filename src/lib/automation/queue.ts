import "server-only";
import { todayInKolkata } from "@/lib/date-math";
import { getStore } from "@/lib/store";
import type { QueueItem } from "@/types";
import { QueueItemNotFoundError } from "./errors";

// Runs are counted by the real India day, not by the demo clock's date.
export function queueDay(now: Date = new Date()): string {
  return todayInKolkata(now);
}

export function listQueue(): Promise<QueueItem[]> {
  return getStore().listQueue();
}

// A reminder item comes back with the next daily run if the invoice is still overdue; a retainer
// item does not, because its schedule has already moved on.
export async function dismissQueueItem(id: string): Promise<void> {
  if (!(await getStore().removeQueueItem(id))) throw new QueueItemNotFoundError();
}
