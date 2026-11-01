import { setInvoiceHiddenInDemo } from "@/lib/demo/hide-invoice";
import { hiddenInvoiceRequestSchema, type HiddenInvoiceResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, hiddenInvoiceRequestSchema);
  if (!parsed.ok) return parsed.response;

  const { invoiceId, hidden } = parsed.data;
  try {
    await setInvoiceHiddenInDemo(invoiceId, hidden);
    return ok<HiddenInvoiceResponse>({ invoiceId, hidden });
  } catch (error) {
    return failFromError(error);
  }
}
