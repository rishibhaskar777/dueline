import { recordPayment } from "@/lib/invoices/record-payment";
import { invoiceIdSchema, recordPaymentRequestSchema, type RecordPaymentResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody, parseParam } from "@/app/api/_lib/validate";

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/invoices/[id]/record-payment">,
): Promise<Response> {
  const id = parseParam((await ctx.params).id, "id", invoiceIdSchema);
  if (!id.ok) return id.response;
  const parsed = await parseBody(req, recordPaymentRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    return ok<RecordPaymentResponse>(await recordPayment(id.data, parsed.data));
  } catch (error) {
    return failFromError(error);
  }
}
