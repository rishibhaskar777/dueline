import { addMonths } from "@/lib/date-math";

function dateIn(month: string, dayOfMonth: number): string {
  return `${month}-${String(dayOfMonth).padStart(2, "0")}`;
}

// The first date with this day of the month that is after `after`. The day is 1 to 28, so every
// month has it, February included.
export function nextRepeatDate(dayOfMonth: number, after: string): string {
  const thisMonth = dateIn(after.slice(0, 7), dayOfMonth);
  return thisMonth > after ? thisMonth : dateIn(addMonths(after.slice(0, 7), 1), dayOfMonth);
}
