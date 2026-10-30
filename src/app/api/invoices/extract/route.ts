import { ExtractionFailedError, extractInvoiceDraft } from "@/lib/ai/extract-invoice";
import { AiUnavailableError } from "@/lib/ai/model";
import { AiQuotaError, reserveModelCall } from "@/lib/ai/quota";
import { extractRequestSchema, type ExtractResponse } from "@/types";
import { addressOf } from "@/app/api/_lib/address";
import { failFromError } from "@/app/api/_lib/errors";
import { fail, ok } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

const UNAVAILABLE = "AI is unavailable right now. You can still fill the invoice by hand.";

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, extractRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const extracted = await extractInvoiceDraft(parsed.data.chat, {
      beforeModelCall: () => reserveModelCall(addressOf(req)),
    });
    // The late-payer radar arrives in a later step, so there is no risk to report yet.
    const body: ExtractResponse = { ...extracted, risk: null };
    return ok(body);
  } catch (error) {
    if (error instanceof AiQuotaError) {
      return error.scope === "address"
        ? fail(429, "rate_limited", error.message)
        : fail(503, "ai_unavailable", error.message);
    }
    if (error instanceof AiUnavailableError) return fail(503, "ai_unavailable", UNAVAILABLE);
    if (error instanceof ExtractionFailedError)
      return fail(422, "extraction_failed", error.message);
    return failFromError(error);
  }
}
