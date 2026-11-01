import { AiQuotaError, reserveReminderDraft } from "@/lib/ai/quota";
import { draftReminderFor } from "@/lib/reminders/reminder-drafts";
import { draftReminderRequestSchema, type ReminderDraft } from "@/types";
import { addressOf } from "@/app/api/_lib/address";
import { failFromError } from "@/app/api/_lib/errors";
import { fail, ok } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, draftReminderRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { invoiceId, tone, language } = parsed.data;
    return ok<ReminderDraft>(
      await draftReminderFor(invoiceId, tone, {
        language,
        beforeModelCall: () => reserveReminderDraft(addressOf(req)),
      }),
    );
  } catch (error) {
    if (error instanceof AiQuotaError) return fail(429, "rate_limited", error.message);
    return failFromError(error);
  }
}
