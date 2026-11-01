import "server-only";
import { today } from "@/lib/clock";
import { countryName } from "@/lib/countries";
import { loadVisibleInvoices } from "@/lib/demo/visible-invoices";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import type { InvoicePayout } from "@/lib/money/invoice-payout";
import { isRecordedOutsidePayPal } from "@/lib/paypal/map";
import type { LoadedInvoice } from "@/lib/paypal/summaries";
import { resolvePayouts } from "@/lib/payouts/resolve-payouts";
import { getSettingsAndRates } from "@/lib/settings";
import { getStore } from "@/lib/store";
import {
  currencySchema,
  type ExportOutsideRow,
  type ExportRegister,
  type ExportRegisterRow,
  type Money,
} from "@/types";

type Rupees = Pick<ExportRegisterRow, "inrReceived" | "inrSource" | "rateUsed" | "rateDate">;
type Dated = Pick<ExportRegisterRow, "paidOn" | "invoiceNumber">;

function rupeesOf(payout: InvoicePayout): Rupees {
  return {
    inrReceived: payout.inr,
    inrSource: payout.source === "paypal" ? "paypal" : "estimate",
    rateUsed: payout.rateUsed,
    rateDate: payout.rateDate,
  };
}

type SharedFields = Omit<ExportOutsideRow, "bankReference">;

function sharedFields(
  { summary, underLut, sac }: LoadedInvoice,
  paidOn: string,
  payout: InvoicePayout,
): SharedFields {
  return {
    invoiceId: summary.id,
    invoiceNumber: summary.number,
    clientName: summary.client.name,
    clientCountry: countryName(summary.client.country),
    paidOn,
    foreign: summary.amount,
    ...rupeesOf(payout),
    purposeCode: summary.purposeCode,
    sac,
    underLut,
  };
}

function toOutsideRow(
  invoice: LoadedInvoice,
  paidOn: string,
  payout: InvoicePayout,
  bankReference: string | null,
): ExportOutsideRow {
  return { ...sharedFields(invoice, paidOn, payout), bankReference };
}

function toRow(invoice: LoadedInvoice, paidOn: string, payout: InvoicePayout): ExportRegisterRow {
  const actual = invoice.summary.actualPayout;
  return {
    ...sharedFields(invoice, paidOn, payout),
    fee: actual?.fee ?? null,
    net: actual?.net ?? null,
    transactionId: actual?.transactionId ?? invoice.paymentId,
  };
}

function totalsByCurrency(rows: Pick<ExportRegisterRow, "foreign">[]): Money[] {
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

function sumRupees(rows: Rupees[], source?: ExportRegisterRow["inrSource"]): number {
  return rows
    .filter((row) => source === undefined || row.inrSource === source)
    .reduce((sum, row) => sum + row.inrReceived, 0);
}

const byPaidDate = (a: Dated, b: Dated): number =>
  a.paidOn.localeCompare(b.paidOn) ||
  a.invoiceNumber.localeCompare(b.invoiceNumber, "en", { numeric: true });

// The newest month, up to the current one, that has a paid invoice, so the page can open there.
function latestMonthWithPayments(paidDates: string[]): string | null {
  const current = today().slice(0, 7);
  const months = paidDates.map((date) => date.slice(0, 7)).filter((month) => month <= current);
  return months.sort().at(-1) ?? null;
}

type PaidInvoice = { invoice: LoadedInvoice; paidOn: string };
type Resolved = Awaited<ReturnType<typeof getSettingsAndRates>>;

async function buildRows(
  paid: PaidInvoice[],
  { settings, market }: Resolved,
  references: Record<string, string>,
): Promise<{ rows: ExportRegisterRow[]; outsideRows: ExportOutsideRow[] }> {
  const isBank = ({ invoice }: PaidInvoice): boolean =>
    isRecordedOutsidePayPal(invoice.summary.paypalStatus);
  const viaBank = paid.filter(isBank);
  const viaPayPal = paid.filter((one) => !isBank(one));
  const resolve = (group: PaidInvoice[]): ReturnType<typeof resolvePayouts> =>
    resolvePayouts(
      group.map(({ invoice }) => invoice),
      settings,
      market,
    );

  const [paypalPayouts, bankPayouts] = await Promise.all([resolve(viaPayPal), resolve(viaBank)]);
  return {
    rows: paypalPayouts
      .map(({ loaded: invoice, payout }, index) => toRow(invoice, viaPayPal[index].paidOn, payout))
      .sort(byPaidDate),
    outsideRows: bankPayouts
      .map(({ loaded: invoice, payout }, index) =>
        toOutsideRow(
          invoice,
          viaBank[index].paidOn,
          payout,
          references[invoice.summary.id] ?? null,
        ),
      )
      .sort(byPaidDate),
  };
}

// An invoice belongs to the month of the India date it was paid on. A partly paid invoice is left
// out until it is paid in full. A payment through PayPal is a row with PayPal's figures and a place on
// its FIRA. A payment recorded outside PayPal, a bank transfer, has no PayPal fee or transaction, so
// it is an outside row that carries the bank's FIRC or e-BRC number once the freelancer has added it.
export async function buildExportRegister(month: string): Promise<ExportRegister> {
  const [loaded, rates, references] = await Promise.all([
    loadVisibleInvoices(),
    getSettingsAndRates(),
    getStore().listBankReferences(),
  ]);

  const paidAll = loaded.flatMap((invoice) => {
    const { paidOn } = invoice.summary;
    return paidOn ? [{ invoice, paidOn }] : [];
  });
  const { rows, outsideRows } = await buildRows(
    paidAll.filter(({ paidOn }) => paidOn.slice(0, 7) === month),
    rates,
    references,
  );

  const paypalFiraInr = sumRupees(rows);
  const bankInr = sumRupees(outsideRows);
  return {
    month,
    latestMonthWithPayments: latestMonthWithPayments(paidAll.map(({ paidOn }) => paidOn)),
    rows,
    outsideRows,
    totalInr: paypalFiraInr + bankInr,
    paypalFiraInr,
    bankInr,
    totalsByCurrency: totalsByCurrency([...rows, ...outsideRows]),
    paypalInr: sumRupees(rows, "paypal"),
    estimatedInr: sumRupees(rows, "estimate"),
    missingPurposeCodes: [...rows, ...outsideRows].filter((row) => row.purposeCode === null).length,
  };
}
