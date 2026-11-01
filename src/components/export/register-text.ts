import { formatMonthName } from "@/lib/format-date";
import { formatRupees } from "@/lib/money/format";
import type { ExportRegister } from "@/types";

// One note under the one rupee figure, never the figure again. A bank transfer is worked out at the
// ECB rate of the payment date, so it counts as estimated.
export function describeRupees({
  totalInr,
  paypalInr,
  estimatedInr,
  bankInr,
}: ExportRegister): string {
  if (totalInr === 0) return "No rupees to report";
  const estimated = estimatedInr + bankInr;
  if (paypalInr === 0) return "All estimated";
  if (estimated === 0) return "All from PayPal";
  return `${formatRupees(paypalInr)} from PayPal, ${formatRupees(estimated)} estimated`;
}

// Said when the register opens on an earlier month because the current one has no payments.
export function fallbackNote(currentMonth: string, latestMonth: string): string {
  const sameYear = currentMonth.slice(0, 4) === latestMonth.slice(0, 4);
  return `No payments in ${formatMonthName(currentMonth, false)} yet. Showing ${formatMonthName(latestMonth, !sameYear)}, the latest month with payments.`;
}

export const FIRA_GUIDE_URL = "https://www.paypal.com/in/brc/article/paypal-monthly-digital-firc";

export const FIRA_EXPLAINER =
  "PayPal issues one consolidated digital FIRA a month, downloadable by the 15th of the next month under Reports > Statements > FIRA. Match this register's totals and transaction IDs with it. Purpose codes are suggestions; confirm them with your CA.";
