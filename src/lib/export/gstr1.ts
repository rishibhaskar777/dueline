import "server-only";
import type { Gstr1Row } from "@/lib/export/gstr1-csv";
import { convertToPaise } from "@/lib/money/payout";
import { loadInvoices } from "@/lib/paypal/summaries";
import { getRatesOn } from "@/lib/rates/rates";
import { getSettings } from "@/lib/settings";
import type { MarketRates } from "@/types";

const IGST_RATE = 18;

// GST follows the invoice date, so an invoice belongs to the month it was issued in, paid or not.
// Its rupee value is the ECB rate of that date. The ECB publishes nothing at weekends, so the rate
// can be that of the last working day before it.
export async function buildGstr1(month: string): Promise<Gstr1Row[]> {
  const [loaded, settings] = await Promise.all([loadInvoices(), getSettings()]);
  const issued = loaded.filter(({ summary }) => summary.issuedOn.slice(0, 7) === month);

  // One request per date, however many invoices were issued on it.
  const lookups = new Map<string, Promise<MarketRates>>();
  const ratesOn = (date: string): Promise<MarketRates> => {
    const known = lookups.get(date) ?? getRatesOn(date, settings);
    lookups.set(date, known);
    return known;
  };

  const rows = await Promise.all(
    issued.map(async ({ summary, underLut }): Promise<Gstr1Row> => {
      const { rates } = await ratesOn(summary.issuedOn);
      return {
        exportType: underLut ? "WOPAY" : "WPAY",
        invoiceNumber: summary.number,
        invoiceDate: summary.issuedOn,
        valuePaise: convertToPaise(summary.amount, rates[summary.amount.currency]),
        rate: underLut ? 0 : IGST_RATE,
      };
    }),
  );
  return rows.sort(
    (a, b) =>
      a.invoiceDate.localeCompare(b.invoiceDate) ||
      a.invoiceNumber.localeCompare(b.invoiceNumber, "en", { numeric: true }),
  );
}
