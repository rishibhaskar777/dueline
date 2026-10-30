import "server-only";
import { todayInKolkata } from "@/lib/date-math";
import { getEnv } from "@/lib/env";

export { addDays, daysBetween, todayInKolkata } from "@/lib/date-math";

const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)\s*(Z|[+-]\d{2}(?::?\d{2})?)$/i;

// PayPal sends either a plain date or a timestamp; a timestamp becomes the date in Asia/Kolkata.
// Without a readable time zone the date part is the best answer there is.
export function toKolkataDate(value: string): string | null {
  if (PLAIN_DATE.test(value)) return value;

  const match = TIMESTAMP.exec(value);
  if (match) {
    const [, date, time, zone] = match;
    const clock = time.length === 5 ? `${time}:00` : time;
    const offset = /^z$/i.test(zone)
      ? "Z"
      : `${zone.slice(0, 3)}:${zone.replace(":", "").slice(3) || "00"}`;
    const instant = new Date(`${date}T${clock}${offset}`);
    if (!Number.isNaN(instant.getTime())) return todayInKolkata(instant);
  }

  const leading = value.slice(0, 10);
  return PLAIN_DATE.test(leading) ? leading : null;
}

export function today(now: Date = new Date()): string {
  return getEnv().DEMO_TODAY ?? todayInKolkata(now);
}

export function isDemoClock(): boolean {
  return getEnv().DEMO_TODAY !== undefined;
}
