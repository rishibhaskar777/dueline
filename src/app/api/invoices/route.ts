import { today } from "@/lib/clock";
import { computeTotals } from "@/lib/money/totals";
import { loadInvoiceSummaries } from "@/lib/paypal/summaries";
import { brightwellInvoice } from "@/mocks/fixtures";
import { createInvoiceRequestSchema, type InvoicesResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { stubOk } from "@/app/api/_lib/stub";
import { parseBody } from "@/app/api/_lib/validate";

export async function GET(): Promise<Response> {
  try {
    const invoices = await loadInvoiceSummaries();
    return ok<InvoicesResponse>({ invoices, totals: computeTotals(invoices, today()) });
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, createInvoiceRequestSchema);
  if (!parsed.ok) return parsed.response;
  return stubOk({ invoice: brightwellInvoice, sent: true });
}
