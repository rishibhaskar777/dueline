import { saveBankReference } from "@/lib/export/bank-reference";
import {
  BANK_REFERENCE_MESSAGE,
  bankReferenceRequestSchema,
  type BankReferenceResponse,
} from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

export async function PUT(req: Request): Promise<Response> {
  const parsed = await parseBody(req, bankReferenceRequestSchema, {
    reference: BANK_REFERENCE_MESSAGE,
  });
  if (!parsed.ok) return parsed.response;

  const { invoiceId, reference } = parsed.data;
  try {
    return ok<BankReferenceResponse>({
      invoiceId,
      reference: await saveBankReference(invoiceId, reference),
    });
  } catch (error) {
    return failFromError(error);
  }
}
