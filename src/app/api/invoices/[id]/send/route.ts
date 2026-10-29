import { invoices } from "@/mocks/fixtures";
import { sendInvoiceRequestSchema } from "@/types";
import { fail } from "@/app/api/_lib/respond";
import { stubOk } from "@/app/api/_lib/stub";
import { parseBody } from "@/app/api/_lib/validate";

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/invoices/[id]/send">,
): Promise<Response> {
  const { id } = await ctx.params;
  const parsed = await parseBody(req, sendInvoiceRequestSchema);
  if (!parsed.ok) return parsed.response;

  const invoice = invoices.find((candidate) => candidate.id === id);
  if (!invoice) return fail(404, "not_found", "No invoice with that ID exists.");
  return stubOk({ invoice, sent: true });
}
