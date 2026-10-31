import "server-only";
import { loadInvoices } from "@/lib/paypal/summaries";
import { riskLevelsById } from "@/lib/risk/client-risk";
import { getSettingsAndRates } from "@/lib/settings";
import type { InvoiceSummary } from "@/types";
import { resolvePayouts } from "./resolve-payouts";

// Every invoice as the screens see it: rupees by the one payout rule and the client's risk level.
export async function loadSummaries(): Promise<InvoiceSummary[]> {
  const [loaded, { settings, market }] = await Promise.all([loadInvoices(), getSettingsAndRates()]);
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
