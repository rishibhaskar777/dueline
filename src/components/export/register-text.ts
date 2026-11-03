import { formatMonthName } from "@/lib/format-date";
import type { ExportRegister } from "@/types";

// One note under the one rupee figure, never the figure again: how many payments rest on PayPal's
// figures (the rupees it reported, or its fee and net with the rupees worked out at the ECB rate),
// how many were paid by bank transfer, and how many are estimates from the published fees.
export function describeRupees({ totalInr, rows, outsideRows }: ExportRegister): string {
  if (totalInr === 0) return "No rupees to report";
  const fromPayPal = rows.filter((row) => row.inrSource === "paypal" || row.fee !== null).length;
  const parts: [number, string, string][] = [
    [fromPayPal, "from PayPal's figures", "All from PayPal's figures"],
    [rows.length - fromPayPal, "estimated", "All estimated"],
    [outsideRows.length, "by bank", "All by bank"],
  ];
  const present = parts.filter(([count]) => count > 0);
  if (present.length === 1) return present[0][2];
  return present.map(([count, words]) => `${count} ${words}`).join(", ");
}

// Said when the register opens on an earlier month because the current one has no payments.
export function fallbackNote(currentMonth: string, latestMonth: string): string {
  const sameYear = currentMonth.slice(0, 4) === latestMonth.slice(0, 4);
  return `No payments in ${formatMonthName(currentMonth, false)} yet. Showing ${formatMonthName(latestMonth, !sameYear)}, the latest month with payments.`;
}

export const FIRA_GUIDE_URL = "https://www.paypal.com/in/brc/article/paypal-monthly-digital-firc";

export const FIRA_EXPLAINER =
  "PayPal issues one consolidated digital FIRA a month, downloadable by the 15th of the next month under Reports > Statements > FIRA. Match this register's totals and transaction IDs with it. Purpose codes are suggestions; confirm them with your CA.";
