import { reminders } from "@/mocks/fixtures";
import { draftReminderRequestSchema } from "@/types";
import { fail } from "@/app/api/_lib/respond";
import { stubOk } from "@/app/api/_lib/stub";
import { parseBody } from "@/app/api/_lib/validate";

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, draftReminderRequestSchema);
  if (!parsed.ok) return parsed.response;

  const { invoiceId, tone } = parsed.data;
  const draft = reminders.find((candidate) => candidate.invoiceId === invoiceId);
  if (!draft) return fail(404, "not_found", "No reminder draft exists for that invoice.");
  return stubOk({ ...draft, tone });
}
