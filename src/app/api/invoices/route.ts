import { today } from "@/lib/clock";
import { createAndSendInvoice } from "@/lib/invoices/create-invoice";
import { payoutInrFor } from "@/lib/money/invoice-payout";
import { computeTotals } from "@/lib/money/totals";
import { loadInvoices } from "@/lib/paypal/summaries";
import { getSettingsAndRates } from "@/lib/settings";
import {
  createInvoiceRequestSchema,
  type CreateInvoiceResponse,
  type InvoicesResponse,
} from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { fail, ok } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

export async function GET(): Promise<Response> {
  try {
    const [loaded, { settings, market }] = await Promise.all([
      loadInvoices(),
      getSettingsAndRates(),
    ]);
    const invoices = loaded.map(({ summary, amountDue }) => ({
      ...summary,
      payoutInr: payoutInrFor(summary, amountDue, settings, market),
    }));
    return ok<InvoicesResponse>({ invoices, totals: computeTotals(invoices, today()) });
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, createInvoiceRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { requestId, ...input } = parsed.data;
    if (input.draft.dueOn < today()) {
      return fail(400, "invalid_request", "dueOn must be today or later");
    }
    return ok<CreateInvoiceResponse>(await createAndSendInvoice(input, requestId));
  } catch (error) {
    return failFromError(error);
  }
}
