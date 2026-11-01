import "server-only";
import { getEnv } from "@/lib/env";
import { getStore } from "@/lib/store";
import type { ActivityEvent } from "@/types";
import { isDemoMemo } from "./story";
import { storyEventAt } from "./story-events";
import { loadVisibleInvoices } from "./visible-invoices";

// The feed is read from a wider window than it shows: events of hidden invoices are dropped and
// events of the story are moved to its dates, which changes their order.
const WINDOW = 200;

// In the demo the feed holds only visible invoices, and the story's "sent" and "paid" events carry
// the story's dates, so rows written with the real time before dates were seeded read correctly
// without a data migration. Outside the demo the feed is the stored events.
export async function loadActivityFeed(limit: number): Promise<ActivityEvent[]> {
  const store = getStore();
  if (!getEnv().DEMO_MODE) return store.latestActivity(limit);

  const [stored, visible] = await Promise.all([
    store.latestActivity(WINDOW),
    loadVisibleInvoices(),
  ]);
  const invoices = new Map(visible.map((invoice) => [invoice.summary.id, invoice]));
  return stored
    .flatMap((event) => {
      const invoice = invoices.get(event.invoiceId);
      if (!invoice) return [];
      const at = isDemoMemo(invoice.marker)
        ? storyEventAt(event.kind, invoice.summary, event.at)
        : event.at;
      return [{ ...event, at }];
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
