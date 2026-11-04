import { addDays } from "@/lib/date-math";
import { formatDayMonth } from "@/lib/format-date";

// The sample invoice on the sign-in picture was sent 15 days ago and is due in 2 days, so its card
// is true on any day. The bar's 88% is 15 of those 17 days.
export function sampleInvoiceDates(today: string): { sent: string; due: string } {
  return {
    sent: formatDayMonth(addDays(today, -15)),
    due: formatDayMonth(addDays(today, 2)),
  };
}
