import { countryName } from "@/lib/countries";
import { findPurposeCode } from "@/lib/export/purpose-codes";
import { formatDate } from "@/lib/format-date";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import { formatMoney } from "@/lib/money/format";
import type { InvoiceDetailResponse, Profile } from "@/types";

export interface PrintRow {
  description: string;
  sac: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

export interface PrintDocument {
  supplier: { businessName: string; name: string; gstin: string; address: string; website: string };
  number: string;
  issuedOn: string;
  recipient: { name: string; contactName: string; country: string };
  placeOfSupply: string;
  rows: PrintRow[];
  discount: string | null;
  total: string;
  dueOn: string;
  payLink: string;
  purposeCode: string;
  endorsement: string;
  underLut: boolean;
  reverseCharge: string;
}

const LUT_ARN_LINE = /LUT ARN: ([0-9A-Z]{15})/;
// Dueline does not calculate integrated tax, so an invoice not under LUT cannot carry the endorsement
// for an export with payment of tax: it would claim tax the page does not show.
export const NOT_UNDER_LUT_WARNING =
  "Not under LUT: integrated tax (IGST) must be shown on this invoice. Add it with your CA before sending.";

// The endorsement Rule 46 asks of an export under LUT, or the warning in its place. The ARN is the one written on the invoice, and
// the end date is the profile's, shown only while the profile still holds that same ARN.
function endorsementOf({ details }: InvoiceDetailResponse, profile: Profile): string {
  if (!details.underLut) return NOT_UNDER_LUT_WARNING;
  const arn = LUT_ARN_LINE.exec(details.note)?.[1] ?? null;
  const validUntil = arn && profile.lutArn === arn ? profile.lutValidUntil : null;
  return [
    "Supply meant for export under bond or Letter of Undertaking without payment of integrated tax.",
    arn && `LUT ARN ${arn}${validUntil ? `, valid until ${formatDate(validUntil)}` : ""}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildPrintDocument(detail: InvoiceDetailResponse, profile: Profile): PrintDocument {
  const { invoice, details } = detail;
  const code = invoice.purposeCode ? findPurposeCode(invoice.purposeCode) : undefined;
  const itemsMinor = details.items.reduce(
    (sum, item) => sum + item.quantity * toMinorUnits(item.unitAmount.value),
    0,
  );
  const gap = itemsMinor - toMinorUnits(invoice.amount.value);

  return {
    supplier: {
      businessName: profile.businessName,
      name: profile.yourName,
      gstin: profile.gstin ?? "",
      address: profile.address ?? "",
      website: profile.website ?? "",
    },
    number: invoice.number,
    issuedOn: formatDate(invoice.issuedOn),
    recipient: {
      name: invoice.client.name,
      contactName: invoice.client.contactName ?? "",
      country: countryName(invoice.client.country) ?? "",
    },
    placeOfSupply: "Outside India",
    rows: details.items.map((item) => ({
      description: item.name,
      sac: item.sac ?? "",
      quantity: String(item.quantity),
      unitPrice: formatMoney(item.unitAmount),
      amount: formatMoney({
        currency: item.unitAmount.currency,
        value: fromMinorUnits(item.quantity * toMinorUnits(item.unitAmount.value)),
      }),
    })),
    discount:
      gap > 0
        ? formatMoney({ currency: invoice.amount.currency, value: fromMinorUnits(gap) })
        : null,
    total: formatMoney(invoice.amount),
    dueOn: formatDate(invoice.dueOn),
    payLink: invoice.payLink,
    purposeCode: code ? `${code.code} · ${code.label}` : "",
    endorsement: endorsementOf(detail, profile),
    underLut: details.underLut,
    reverseCharge: "No",
  };
}
