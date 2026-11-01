import "server-only";
import { today } from "@/lib/clock";
import { todayInKolkata } from "@/lib/date-math";
import { prepareReminderDrafts } from "@/lib/reminders/reminder-drafts";
import { clearInvoiceCaches, loadInvoices } from "@/lib/paypal/summaries";
import { runClaimed } from "@/lib/requests/run-claimed";
import { getSettings } from "@/lib/settings";
import { getStore } from "@/lib/store";
import type { DailyRunResponse, InvoiceSummary, QueueItem, ReminderDraft } from "@/types";
import { computeDigest, getDailyDigest, storeDigest } from "./daily-digest";
import { queueDay } from "./queue";
import { reminderQueueItem } from "./queue-items";
import { prepareDueRepeats } from "./repeats";

const MESSAGES = {
  conflict: "The daily preparation was started with other details.",
  inProgress: "Today's preparation is still running. Try again in a minute.",
};

function wasRemindedToday(draft: ReminderDraft, day: string): boolean {
  return draft.history.some(({ sentAt }) => todayInKolkata(new Date(sentAt)) === day);
}

// Overdue invoices that have waited long enough and have not been chased today, each with the
// draft that was just written for it.
function dueForReminder(
  drafts: ReminderDraft[],
  invoices: InvoiceSummary[],
  afterDays: number,
  day: string,
): InvoiceSummary[] {
  return drafts
    .filter((draft) => !wasRemindedToday(draft, day))
    .flatMap((draft) => invoices.filter(({ id }) => id === draft.invoiceId))
    .filter(({ daysLate }) => daysLate >= afterDays);
}

async function prepareReminders(day: string): Promise<QueueItem[]> {
  const [drafts, loaded, { remindAfterDays }] = await Promise.all([
    prepareReminderDrafts(),
    loadInvoices(),
    getSettings(),
  ]);
  const summaries = loaded.map(({ summary }) => summary);
  return dueForReminder(drafts, summaries, remindAfterDays, day).map(reminderQueueItem);
}

// The reminder items are the current list, so an invoice that was paid or is no longer overdue
// drops out. Switching the morning reminders off clears them too.
async function prepare(): Promise<void> {
  const day = queueDay();
  clearInvoiceCaches();
  const reminders = (await getSettings()).prepareReminders ? await prepareReminders(day) : [];
  await getStore().replaceQueueItems("reminder", reminders);
  await prepareDueRepeats(today());
  await storeDigest(await computeDigest());
}

// Once per India day, however many times it is asked for: a second call, a retry by the cron
// service or the demo button, finds the day already done. Nothing here sends anything to PayPal; it
// only writes drafts and queue entries for the freelancer to review.
export async function runDailyPreparation(): Promise<DailyRunResponse> {
  let ran = false;
  const day = queueDay();
  await runClaimed(getStore(), {
    requestId: `daily-run:${day}`,
    body: { day },
    messages: MESSAGES,
    readStored: () => ({ day }),
    run: async () => {
      ran = true;
      await prepare();
      return { day };
    },
  });
  return { ran, digest: await getDailyDigest() };
}
