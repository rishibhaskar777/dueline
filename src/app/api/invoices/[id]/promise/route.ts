import { removePaymentPromise, savePaymentPromise } from "@/lib/promises/promises";
import { invoiceIdSchema, putPromiseRequestSchema, type PaymentPromise } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { noContent, ok } from "@/app/api/_lib/respond";
import { parseBody, parseParam } from "@/app/api/_lib/validate";

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/invoices/[id]/promise">,
): Promise<Response> {
  const id = parseParam((await ctx.params).id, "id", invoiceIdSchema);
  if (!id.ok) return id.response;
  const parsed = await parseBody(req, putPromiseRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    return ok<PaymentPromise>(await savePaymentPromise(id.data, parsed.data));
  } catch (error) {
    return failFromError(error);
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/invoices/[id]/promise">,
): Promise<Response> {
  const id = parseParam((await ctx.params).id, "id", invoiceIdSchema);
  if (!id.ok) return id.response;

  try {
    await removePaymentPromise(id.data);
    return noContent();
  } catch (error) {
    return failFromError(error);
  }
}
