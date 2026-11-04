import { connection } from "next/server";
import { remindersLeftToday } from "@/lib/reminders/daily-limit";
import { listHeadsUpDrafts, listReminderDrafts } from "@/lib/reminders/reminder-drafts";
import { getStore } from "@/lib/store";
import type { RemindersResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";

export async function GET(): Promise<Response> {
  await connection();
  try {
    const [drafts, headsUps, remindersLeft] = await Promise.all([
      listReminderDrafts(),
      listHeadsUpDrafts(),
      remindersLeftToday(getStore()),
    ]);
    return ok<RemindersResponse>({ drafts, headsUps, remindersLeftToday: remindersLeft });
  } catch (error) {
    return failFromError(error);
  }
}
