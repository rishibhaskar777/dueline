import { csvFile, csvLine } from "@/lib/export/csv-text";
import { ESTIMATE_LABEL, OVER_LIMIT_WARNING } from "@/lib/export/tax-notes";
import type { AnnualSummary } from "@/types";

export function toAnnualCsv(summary: AnnualSummary): string {
  return csvFile([
    csvLine([ESTIMATE_LABEL]),
    csvLine(["Financial year", summary.fy]),
    csvLine(["From", summary.from]),
    csvLine(["To", summary.to]),
    csvLine(["Received through PayPal (INR)", summary.receivedPayPalInr]),
    csvLine(["Recorded outside PayPal (INR)", summary.receivedOutsideInr]),
    csvLine(["PayPal fees (INR)", summary.paypalFeesInr]),
    csvLine(["Conversion loss (INR)", summary.conversionLossInr]),
    csvLine(["Gross receipts (INR)", summary.grossReceiptsInr]),
    csvLine(["Section 44ADA presumptive income, 50% (INR)", summary.presumptiveIncomeInr]),
    csvLine(["Section 44ADA limit (INR)", summary.presumptiveLimitInr]),
    csvLine(["Invoices paid", summary.invoiceCount]),
    csvLine(["Clients", summary.clientCount]),
    ...(summary.overLimit ? [csvLine(["Warning", OVER_LIMIT_WARNING])] : []),
  ]);
}
