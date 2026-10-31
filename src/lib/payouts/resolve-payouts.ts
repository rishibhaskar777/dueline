import "server-only";
import { payoutFor, rateDateFor, type InvoicePayout } from "@/lib/money/invoice-payout";
import type { LoadedInvoice } from "@/lib/paypal/summaries";
import { getRatesOn } from "@/lib/rates/rates";
import type { MarketRates, Settings } from "@/types";

interface InvoiceWithPayout {
  loaded: LoadedInvoice;
  payout: InvoicePayout;
  // The ECB rates behind the payout: those of the payment date for a paid invoice.
  rates: MarketRates;
}

// Receivables and the export register both read their rupees from here, so one payment never has
// two figures. `market` is today's rate, used for unpaid invoices and whenever no date applies.
export async function resolvePayouts(
  invoices: LoadedInvoice[],
  settings: Settings,
  market: MarketRates,
): Promise<InvoiceWithPayout[]> {
  // One request per date, however many invoices were paid on it.
  const lookups = new Map<string, Promise<MarketRates>>();
  const ratesOn = (date: string | null): Promise<MarketRates> => {
    if (date === null) return Promise.resolve(market);
    const known = lookups.get(date) ?? getRatesOn(date, settings);
    lookups.set(date, known);
    return known;
  };

  return Promise.all(
    invoices.map(async (loaded) => {
      const { summary, amountDue } = loaded;
      const rates = await ratesOn(rateDateFor(summary));
      return { loaded, payout: payoutFor(summary, amountDue, settings, rates), rates };
    }),
  );
}
