import { sendExistingDraft } from "@/lib/invoices/create-invoice";
import { invoiceIdSchema, sendInvoiceRequestSchema, type SendInvoiceResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody, parseParam } from "@/app/api/_lib/validate";

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/invoices/[id]/send">,
): Promise<Response> {
  const id = parseParam((await ctx.params).id, "id", invoiceIdSchema);
  if (!id.ok) return id.response;
  const parsed = await parseBody(req, sendInvoiceRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    return ok<SendInvoiceResponse>(await sendExistingDraft(id.data, parsed.data.requestId));
  } catch (error) {
    return failFromError(error);
  }
}
