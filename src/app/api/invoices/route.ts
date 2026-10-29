import { brightwellInvoice, invoices, totals } from "@/mocks/fixtures";
import { createInvoiceRequestSchema } from "@/types";
import { stubOk } from "../_lib/stub";
import { parseBody } from "../_lib/validate";

export async function GET(): Promise<Response> {
  return stubOk({ invoices, totals });
}

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, createInvoiceRequestSchema);
  if (!parsed.ok) return parsed.response;
  return stubOk({ invoice: brightwellInvoice, sent: true });
}
