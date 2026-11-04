import { today } from "@/lib/clock";
import { createDepositAndBalance } from "@/lib/invoices/create-split";
import { createSplitRequestSchema, type CreateSplitResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { fail, ok } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, createSplitRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { requestId, balanceRequestId, ...input } = parsed.data;
    const { depositDueOn, balanceDueOn } = input.split;
    if (depositDueOn < today() || balanceDueOn < today()) {
      return fail(400, "invalid_request", "dueOn must be today or later");
    }
    return ok<CreateSplitResponse>(
      await createDepositAndBalance(input, requestId, balanceRequestId),
    );
  } catch (error) {
    return failFromError(error);
  }
}
