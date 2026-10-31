import type { Tone } from "@/types";

const FIRM_FROM_DAYS = 8;
const FINAL_AFTER_DAYS = 20;

export function suggestTone(daysLate: number, history: readonly unknown[]): Tone {
  if (daysLate > FINAL_AFTER_DAYS || history.length >= 2) return "final";
  if (daysLate >= FIRM_FROM_DAYS || history.length === 1) return "firm";
  return "gentle";
}
