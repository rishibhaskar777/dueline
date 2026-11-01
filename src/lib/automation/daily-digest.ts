import "server-only";
import { today } from "@/lib/clock";
import { loadVisibleInvoices } from "@/lib/demo/visible-invoices";
import type { DailyDigest } from "@/types";
import { buildDigest } from "./digest";
import { listQueue } from "./queue";
import { triggeredRateAlerts } from "./rate-alert-status";

// Worked out from the shown invoices and the cleaned queue each time it is read, so it never lists
// an invoice that has since been cancelled or paid.
export async function getDailyDigest(): Promise<DailyDigest> {
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
