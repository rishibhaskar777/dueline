import { todayInKolkata } from "@/lib/date-math";
import type { Store } from "@/lib/store/store";

// PayPal allows two reminders a day per caller, and its day is counted here as an India day.
export const PAYPAL_REMINDERS_PER_DAY = 2;

const LIMIT_HIT_KEY = "paypal-reminder-limit";
const LIMIT_HIT_TTL_SECONDS = 36 * 60 * 60;

// PayPal's own 429 is the proof that the limit is used up, even when the log counts fewer: the
// account is shared by everyone using the demo.
export async function recordPayPalLimit(store: Store, now: Date = new Date()): Promise<void> {
  await store.putCached(LIMIT_HIT_KEY, todayInKolkata(now), LIMIT_HIT_TTL_SECONDS);
}

export async function remindersLeftToday(store: Store, now: Date = new Date()): Promise<number> {
  const day = todayInKolkata(now);
  if ((await store.getCached(LIMIT_HIT_KEY)) === day) return 0;
  const sent = await store.countRemindersSince(`${day}T00:00:00+05:30`);
  return Math.max(0, PAYPAL_REMINDERS_PER_DAY - sent);
}
