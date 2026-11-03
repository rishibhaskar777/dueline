import { formatMoney, formatRupees } from "@/lib/money/format";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import { estimatePayout } from "@/lib/money/payout";
import { DEFAULT_SETTINGS, type PayoutEstimate } from "@/types";

export interface SamplePayout {
  estimate: PayoutEstimate;
  gross: string;
  fee: string;
  conversion: string;
  total: string;
  bank: string;
}

// Fixed ECB-style rates on 30 Oct 2026, so the marketing cards never move with the live rate.
const SAMPLE_RATES = { EUR: 106.45, USD: 94.955 };

function samplePayout(currency: keyof typeof SAMPLE_RATES, value: string): SamplePayout {
  const estimate = estimatePayout({ currency, value }, DEFAULT_SETTINGS, {
    value: SAMPLE_RATES[currency],
    onDate: "2026-10-30",
    source: "ecb",
  });
  return {
    estimate,
    gross: formatMoney(estimate.gross),
    fee: `− ${formatMoney(estimate.fee)}`,
    conversion: `− ${formatRupees(estimate.conversionLossInr)}`,
    total: `− ${formatRupees(estimate.lossInr)}`,
    bank: formatRupees(estimate.netInr),
  };
}

export interface SampleItem {
  name: string;
  quantity: number;
  unitAmount: string;
}

// The invoice drafted in step 1 of How it works from "3 templates at €120 plus a layout for €250".
export const SAMPLE_ITEMS: SampleItem[] = [
  { name: "Social media template", quantity: 3, unitAmount: "120.00" },
  { name: "Newsletter layout", quantity: 1, unitAmount: "250.00" },
];

export function sampleItemTotal(item: SampleItem): string {
  return fromMinorUnits(toMinorUnits(item.unitAmount) * item.quantity);
}

export const SAMPLE_INVOICE_TOTAL: string = fromMinorUnits(
  SAMPLE_ITEMS.reduce((sum, item) => sum + toMinorUnits(sampleItemTotal(item)), 0),
);

export const HOW_IT_WORKS_PAYOUT: SamplePayout = samplePayout("EUR", SAMPLE_INVOICE_TOTAL);
export const LANDING_PAYOUT: SamplePayout = samplePayout("USD", "900.00");
