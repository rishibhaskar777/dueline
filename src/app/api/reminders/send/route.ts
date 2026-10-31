import { sendReminder } from "@/lib/reminders/send-reminder";
import { sendReminderRequestSchema, type SendReminderResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, sendReminderRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    return ok<SendReminderResponse>(await sendReminder(parsed.data));
  } catch (error) {
    return failFromError(error);
  }
}
