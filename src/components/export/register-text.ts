import { formatRupees } from "@/lib/money/format";
import type { ExportRegister } from "@/types";

// Only the parts that exist are named, so a month with no estimates does not say "estimated ₹0".
export function describeRupeeSplit({
  paypalFiraInr,
  estimatedInr,
  bankInr,
}: ExportRegister): string {
  const parts = [
    paypalFiraInr > 0 ? `PayPal FIRA ${formatRupees(paypalFiraInr)}` : null,
    estimatedInr > 0 ? `of which estimated ${formatRupees(estimatedInr)}` : null,
    bankInr > 0 ? `bank transfers ${formatRupees(bankInr)}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : "No rupees to report";
}

export const FIRA_GUIDE_URL = "https://www.paypal.com/in/brc/article/paypal-monthly-digital-firc";

export const FIRA_EXPLAINER =
  "PayPal issues one consolidated digital FIRA a month, downloadable by the 15th of the next month under Reports > Statements > FIRA. Match this register's totals and transaction IDs with it. Purpose codes are suggestions; confirm them with your CA.";
