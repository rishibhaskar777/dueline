import { listReminderDrafts } from "@/lib/reminders/reminder-drafts";
import type { RemindersResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";

export async function GET(): Promise<Response> {
  try {
    return ok<RemindersResponse>({ drafts: await listReminderDrafts() });
  } catch (error) {
    return failFromError(error);
  }
}
