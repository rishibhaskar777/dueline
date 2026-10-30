import { sendExistingDraft } from "@/lib/invoices/create-invoice";
import { sendInvoiceRequestSchema, type SendInvoiceResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/invoices/[id]/send">,
): Promise<Response> {
  const { id } = await ctx.params;
  const parsed = await parseBody(req, sendInvoiceRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    return ok<SendInvoiceResponse>(await sendExistingDraft(id, parsed.data.requestId));
  } catch (error) {
    return failFromError(error);
  }
}
