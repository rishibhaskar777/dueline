import { formatWeekdayDate } from "@/lib/format-date";
import type { HealthResponse } from "@/types";

const hourInKolkata = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Kolkata",
});

export function kolkataHour(now: Date): number {
  return Number(hourInKolkata.format(now));
}

export function firstName(fullName: string | null): string | null {
  return fullName?.trim().split(/\s+/)[0] || null;
}

// "Good day" stands in until the hour is known, so the heading keeps its box.
export function greeting(hour: number | null, name: string | null): string {
  const word =
    hour === null
      ? "Good day"
      : hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";
  const first = firstName(name);
  return first ? `${word}, ${first}` : word;
}

export function dateLine(today: string, demoClock: boolean): string {
  return `${formatWeekdayDate(today)}${demoClock ? " (demo date)" : ""}`;
}

export function connectionStatus(health: HealthResponse): { text: string; connected: boolean } {
  if (health.offline) return { text: "Simulated PayPal sandbox", connected: true };
  return health.paypal === "connected"
    ? { text: "PayPal sandbox connected", connected: true }
    : { text: "PayPal sandbox not connected", connected: false };
}
