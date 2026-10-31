import "server-only";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import { payoutInrFor } from "@/lib/money/invoice-payout";
import { paypalRateFor } from "@/lib/money/payout";
import { isRecordedOutsidePayPal } from "@/lib/paypal/map";
import { loadInvoices, type LoadedInvoice } from "@/lib/paypal/summaries";
import { getRatesOn } from "@/lib/rates/rates";
import { getSettings } from "@/lib/settings";
import {
  currencySchema,
  type ExportRegister,
  type ExportRegisterRow,
  type MarketRates,
  type Money,
  type Settings,
} from "@/types";

type RatesOn = (date: string) => Promise<MarketRates>;
type Rupees = Pick<ExportRegisterRow, "inrReceived" | "inrSource" | "rateUsed" | "rateDate">;

// One request per date, however many invoices were paid on it.
function ratesLookup(settings: Settings): RatesOn {
  const lookups = new Map<string, Promise<MarketRates>>();
  return (date) => {
    const known = lookups.get(date);
    if (known) return known;
    const started = getRatesOn(date, settings);
    lookups.set(date, started);
    return started;
  };
}

async function rupeesOf(
  { summary }: LoadedInvoice,
  paidOn: string,
  settings: Settings,
  ratesOn: RatesOn,
): Promise<Rupees> {
  const reported = summary.actualPayout?.netInr ?? null;
  if (reported !== null) {
    return {
      inrReceived: Math.round(reported),
      inrSource: "paypal",
      rateUsed: null,
      rateDate: null,
    };
  }

  const rates = await ratesOn(paidOn);
  return {
    inrReceived: payoutInrFor(summary, summary.amount, settings, rates),
    inrSource: "estimate",
    rateUsed: paypalRateFor(rates.rates[summary.amount.currency], settings.fxMarkupPercent),
    rateDate: rates.onDate,
  };
}

async function toRow(
  loaded: LoadedInvoice,
  paidOn: string,
  settings: Settings,
  ratesOn: RatesOn,
): Promise<ExportRegisterRow> {
  const { summary, underLut, paymentId } = loaded;
  const actual = summary.actualPayout;
  return {
    invoiceId: summary.id,
    invoiceNumber: summary.number,
    clientName: summary.client.name,
    clientCountry: summary.client.location?.split(",").at(-1)?.trim() || null,
    paidOn,
    foreign: summary.amount,
    fee: actual?.fee ?? null,
    net: actual?.net ?? null,
    ...(await rupeesOf(loaded, paidOn, settings, ratesOn)),
    purposeCode: summary.purposeCode,
    underLut,
    transactionId: actual?.transactionId ?? paymentId,
  };
}

function totalsByCurrency(rows: ExportRegisterRow[]): Money[] {
  const minorUnits = new Map<Money["currency"], number>();
  for (const { foreign } of rows) {
    const soFar = minorUnits.get(foreign.currency) ?? 0;
    minorUnits.set(foreign.currency, soFar + toMinorUnits(foreign.value));
  }
  return currencySchema.options.flatMap((currency) => {
    const total = minorUnits.get(currency);
    return total === undefined ? [] : [{ currency, value: fromMinorUnits(total) }];
  });
}

function sumRupees(rows: ExportRegisterRow[], source?: ExportRegisterRow["inrSource"]): number {
  return rows
    .filter((row) => source === undefined || row.inrSource === source)
    .reduce((sum, row) => sum + row.inrReceived, 0);
}

// An invoice belongs to the month of the India date it was paid on. A partly paid invoice is left
// out until it is paid in full. An invoice marked as paid outside PayPal has no PayPal payment, so
// it is listed by number after the table and left out of the rows and the rupee totals.
export async function buildExportRegister(month: string): Promise<ExportRegister> {
  const [loaded, settings] = await Promise.all([loadInvoices(), getSettings()]);
  const ratesOn = ratesLookup(settings);

  const inMonth = loaded.flatMap((invoice) => {
    const { paidOn } = invoice.summary;
    return paidOn?.slice(0, 7) === month ? [{ invoice, paidOn }] : [];
  });
  const paid = inMonth.filter(
    ({ invoice }) => !isRecordedOutsidePayPal(invoice.summary.paypalStatus),
  );
  const outside = inMonth.filter(({ invoice }) =>
    isRecordedOutsidePayPal(invoice.summary.paypalStatus),
  );
  const rows = (
    await Promise.all(paid.map(({ invoice, paidOn }) => toRow(invoice, paidOn, settings, ratesOn)))
  ).sort(
    (a, b) =>
      a.paidOn.localeCompare(b.paidOn) ||
      a.invoiceNumber.localeCompare(b.invoiceNumber, "en", { numeric: true }),
  );

  return {
    month,
    rows,
    totalInr: sumRupees(rows),
    totalsByCurrency: totalsByCurrency(rows),
    paypalInr: sumRupees(rows, "paypal"),
    estimatedInr: sumRupees(rows, "estimate"),
    missingPurposeCodes: rows.filter((row) => row.purposeCode === null).length,
    recordedOutsidePayPal: outside
      .map(({ invoice }) => invoice.summary.number)
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true })),
  };
}
