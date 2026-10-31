import { connection } from "next/server";
import { getInvoiceDetail } from "@/lib/invoices/invoice-detail";
import { invoiceIdSchema, type InvoiceDetailResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseParam } from "@/app/api/_lib/validate";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/invoices/[id]">,
): Promise<Response> {
  await connection();
  const id = parseParam((await ctx.params).id, "id", invoiceIdSchema);
  if (!id.ok) return id.response;
  try {
    return ok<InvoiceDetailResponse>(await getInvoiceDetail(id.data));
  } catch (error) {
    return failFromError(error);
  }
}
