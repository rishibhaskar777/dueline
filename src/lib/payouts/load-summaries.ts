import "server-only";
import { loadVisibleInvoices } from "@/lib/demo/visible-invoices";
import { loadInvoices } from "@/lib/paypal/summaries";
import { riskLevelsById } from "@/lib/risk/client-risk";
import { getSettingsAndRates } from "@/lib/settings";
import type { InvoiceSummary } from "@/types";
import { resolvePayouts } from "./resolve-payouts";

// Every invoice as the screens see it: rupees by the one payout rule and the client's risk level.
// An invoice hidden from the demo is left out unless `includeHidden` is set, which the invoice's own
// page needs so that it can be shown again.
export async function loadSummaries(includeHidden = false): Promise<InvoiceSummary[]> {
  const [loaded, { settings, market }] = await Promise.all([
    includeHidden ? loadInvoices() : loadVisibleInvoices(),
    getSettingsAndRates(),
  ]);
  const levels = riskLevelsById(loaded.map(({ summary }) => summary));
  const resolved = await resolvePayouts(loaded, settings, market);
  return resolved.map(({ loaded: { summary }, payout }) => ({
    ...summary,
    payoutInr: payout.inr,
    payoutSource: payout.source,
    rateDate: payout.rateDate,
    riskLevel: levels.get(summary.id) ?? null,
  }));
}
