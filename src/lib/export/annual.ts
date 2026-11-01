import "server-only";
import { financialYearRange } from "@/lib/date-math";
import { convertToInr, estimatePayout } from "@/lib/money/payout";
import { loadVisibleInvoices } from "@/lib/demo/visible-invoices";
import { resolvePayouts } from "@/lib/payouts/resolve-payouts";
import { normaliseName } from "@/lib/risk/client-key";
import { getSettingsAndRates } from "@/lib/settings";
import type { AnnualSummary, Settings } from "@/types";

// Section 44ADA allows 75 lakh when cash receipts are at most 5% of the total, and 50 lakh
// otherwise. Dueline records no cash, so the higher limit applies.
const PRESUMPTIVE_LIMIT_INR = 7_500_000;

interface Shares {
  received: number;
  fees: number;
  loss: number;
}

type Resolved = Awaited<ReturnType<typeof resolvePayouts>>[number];

// What the client's payment was worth at the market rate of the day, less what reached the bank,
// is the shortfall. PayPal's fee takes the first part of it and the conversion rate the rest.
function sharesOf({ loaded, payout, rates }: Resolved, settings: Settings): Shares {
  const { amount, actualPayout } = loaded.summary;
  if (payout.source === "outside_paypal") return { received: payout.inr, fees: 0, loss: 0 };

  const market = rates.rates[amount.currency];
  const shortfall = Math.max(0, convertToInr(amount, market) - payout.inr);
  const fee =
    actualPayout?.fee ??
    estimatePayout(amount, settings, { value: market, onDate: rates.onDate, source: rates.source })
      .fee;
  const fees = Math.min(convertToInr(fee, market), shortfall);
  return { received: payout.inr, fees, loss: shortfall - fees };
}

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

// Receipts are counted in the financial year they were paid in, by India date.
export async function buildAnnualSummary(fy: string): Promise<AnnualSummary> {
  const { from, to } = financialYearRange(fy);
  const [loaded, { settings, market }] = await Promise.all([
    loadVisibleInvoices(),
    getSettingsAndRates(),
  ]);
  const paid = loaded.filter(({ summary }) => {
    const { paidOn } = summary;
    return summary.dueState === "paid" && paidOn !== null && paidOn >= from && paidOn <= to;
  });
  const resolved = await resolvePayouts(paid, settings, market);

  const shares = resolved.map((invoice) => ({
    source: invoice.payout.source,
    ...sharesOf(invoice, settings),
  }));
  const receivedPayPalInr = sum(
    shares.filter((s) => s.source !== "outside_paypal").map((s) => s.received),
  );
  const receivedOutsideInr = sum(
    shares.filter((s) => s.source === "outside_paypal").map((s) => s.received),
  );
  const paypalFeesInr = sum(shares.map((s) => s.fees));
  const conversionLossInr = sum(shares.map((s) => s.loss));
  const grossReceiptsInr =
    receivedPayPalInr + receivedOutsideInr + paypalFeesInr + conversionLossInr;

  return {
    fy,
    from,
    to,
    receivedPayPalInr,
    receivedOutsideInr,
    paypalFeesInr,
    conversionLossInr,
    grossReceiptsInr,
    presumptiveIncomeInr: Math.round(grossReceiptsInr / 2),
    presumptiveLimitInr: PRESUMPTIVE_LIMIT_INR,
    overLimit: grossReceiptsInr > PRESUMPTIVE_LIMIT_INR,
    invoiceCount: paid.length,
    clientCount: new Set(paid.map(({ summary }) => normaliseName(summary.client.name))).size,
  };
}
