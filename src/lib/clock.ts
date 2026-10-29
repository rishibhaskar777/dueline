import "server-only";
import { getEnv } from "@/lib/env";

const MS_PER_DAY = 86_400_000;

const kolkataDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parseDate(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function todayInKolkata(now: Date = new Date()): string {
  const parts = Object.fromEntries(kolkataDate.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

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

export function addDays(date: string, days: number): string {
  return toIsoDate(parseDate(date) + days * MS_PER_DAY);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to) - parseDate(from)) / MS_PER_DAY);
}
