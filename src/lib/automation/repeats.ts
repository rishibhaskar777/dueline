import "server-only";
import { today } from "@/lib/clock";
import { InvalidActionError } from "@/lib/invoices/errors";
import { getInvoiceDetail } from "@/lib/invoices/invoice-detail";
import { clientKey } from "@/lib/risk/client-key";
import { getStore } from "@/lib/store";
import type { RepeatSchedule } from "@/types";
import { RepeatNotFoundError } from "./errors";
import { repeatQueueItem } from "./queue-items";
import { nextRepeatDate } from "./repeat-dates";

export async function listRepeats(client?: string): Promise<RepeatSchedule[]> {
  const repeats = await getStore().listRepeats();
  return client ? repeats.filter((repeat) => repeat.clientKey === client) : repeats;
}

async function findRepeat(id: string): Promise<RepeatSchedule> {
  const found = (await getStore().listRepeats()).find((repeat) => repeat.id === id);
  if (!found) throw new RepeatNotFoundError();
  return found;
}

// The schedule keeps what the invoice held, read from PayPal rather than from the browser. The
// request ID becomes the schedule's ID, so a repeated request saves it once.
export async function createRepeat(
  invoiceId: string,
  dayOfMonth: number,
  requestId: string,
): Promise<RepeatSchedule> {
  const existing = (await getStore().listRepeats()).find((repeat) => repeat.id === requestId);
  if (existing) return existing;

  const { invoice, details } = await getInvoiceDetail(invoiceId);
  if (details.items.length === 0) {
    throw new InvalidActionError("This invoice has no items to repeat.");
  }
  const repeat: RepeatSchedule = {
    id: requestId,
    clientKey: clientKey(invoice.client.name),
    clientName: invoice.client.name,
    clientEmail: invoice.client.email,
    currency: invoice.amount.currency,
    items: details.items.map(({ name, quantity, unitAmount, sac }) => ({
      name,
      quantity,
      unitAmount: unitAmount.value,
      sac,
    })),
    purposeCode: invoice.purposeCode,
    includeLutNote: details.underLut,
    dayOfMonth,
    nextOn: nextRepeatDate(dayOfMonth, today()),
    paused: false,
  };
  await getStore().saveRepeat(repeat);
  return repeat;
}

// A schedule that was paused past its date waits for its next date instead of firing at once.
export async function setRepeatPaused(id: string, paused: boolean): Promise<RepeatSchedule> {
  const repeat = await findRepeat(id);
  const date = today();
  const nextOn =
    !paused && repeat.nextOn <= date ? nextRepeatDate(repeat.dayOfMonth, date) : repeat.nextOn;
  const saved = { ...repeat, paused, nextOn };
  await getStore().saveRepeat(saved);
  return saved;
}

export async function deleteRepeat(id: string): Promise<void> {
  if (!(await getStore().deleteRepeat(id))) throw new RepeatNotFoundError();
}

// Turns every schedule that has come due into a draft in the queue, and only then moves its date on,
// so a run that stops half way is finished by the next one. A schedule that fell behind makes one
// draft, not one for every month it missed.
export async function prepareDueRepeats(date: string): Promise<number> {
  const store = getStore();
  const due = (await store.listRepeats()).filter(
    (repeat) => !repeat.paused && repeat.nextOn <= date,
  );
  for (const repeat of due) {
    await store.addQueueItem(repeatQueueItem(repeat));
    await store.saveRepeat({ ...repeat, nextOn: nextRepeatDate(repeat.dayOfMonth, date) });
  }
  return due.length;
}
