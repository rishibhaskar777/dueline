import "server-only";
import { today } from "@/lib/clock";
import { loadVisibleInvoices } from "@/lib/demo/visible-invoices";
import { getStore } from "@/lib/store";
import type { Json } from "@/lib/store/store";
import { dailyDigestSchema, type DailyDigest } from "@/types";
import { buildDigest } from "./digest";
import { listQueue, queueDay } from "./queue";
import { triggeredRateAlerts } from "./rate-alert-status";

const DIGEST_TTL_SECONDS = 36 * 60 * 60;

function digestKey(): string {
  return `daily-digest:${queueDay()}`;
}

export async function computeDigest(): Promise<DailyDigest> {
  const [loaded, queued, rateAlerts] = await Promise.all([
    loadVisibleInvoices(),
    listQueue(),
    triggeredRateAlerts(),
  ]);
  return buildDigest({
    day: today(),
    invoices: loaded.map(({ summary }) => summary),
    preparedDrafts: queued.length,
    rateAlerts,
  });
}

export async function storeDigest(digest: DailyDigest): Promise<void> {
  const value = JSON.parse(JSON.stringify(digest)) as Json;
  await getStore().putCached(digestKey(), value, DIGEST_TTL_SECONDS);
}

// What the morning run recorded, or, when it has not run today, the same figures worked out now.
export async function getDailyDigest(): Promise<DailyDigest> {
  try {
    const stored = dailyDigestSchema.safeParse(await getStore().getCached(digestKey()));
    if (stored.success) return stored.data;
  } catch {
    console.warn("Could not read the stored digest");
  }
  return computeDigest();
}
