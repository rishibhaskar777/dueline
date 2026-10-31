import "server-only";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import type { InvoicePayout } from "@/lib/money/invoice-payout";
import { isRecordedOutsidePayPal } from "@/lib/paypal/map";
import { loadInvoices, type LoadedInvoice } from "@/lib/paypal/summaries";
import { resolvePayouts } from "@/lib/payouts/resolve-payouts";
import { getSettingsAndRates } from "@/lib/settings";
import { currencySchema, type ExportRegister, type ExportRegisterRow, type Money } from "@/types";

type Rupees = Pick<ExportRegisterRow, "inrReceived" | "inrSource" | "rateUsed" | "rateDate">;

function rupeesOf(payout: InvoicePayout): Rupees {
  return {
    inrReceived: payout.inr,
    inrSource: payout.source === "paypal" ? "paypal" : "estimate",
    rateUsed: payout.rateUsed,
    rateDate: payout.rateDate,
  };
}

function toRow(
  { summary, underLut, sac, paymentId }: LoadedInvoice,
  paidOn: string,
  payout: InvoicePayout,
): ExportRegisterRow {
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
    ...rupeesOf(payout),
    purposeCode: summary.purposeCode,
    sac,
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
  const [loaded, { settings, market }] = await Promise.all([loadInvoices(), getSettingsAndRates()]);

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
  const paidWithPayouts = await resolvePayouts(
    paid.map(({ invoice }) => invoice),
    settings,
    market,
  );
  const rows = paidWithPayouts
    .map(({ loaded: invoice, payout }, index) => toRow(invoice, paid[index].paidOn, payout))
    .sort(
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
