import type { RiskLevel, Tone } from "@/types";

const FIRM_FROM_DAYS = 8;
const FINAL_AFTER_DAYS = 30;
export const FINAL_AFTER_REMINDERS = 2;

// How a client has paid before, as far as the reason for a tone needs it.
export interface Lateness {
  level: RiskLevel;
  lateCount: number;
  invoicesConsidered: number;
}

// Final is for an invoice that has already been chased twice or is more than a month late. A late
// payer's first nudge is firm rather than gentle, but lateness alone never makes it final.
export function suggestTone(
  daysLate: number,
  history: readonly unknown[],
  risk: RiskLevel | null,
): Tone {
  if (history.length >= FINAL_AFTER_REMINDERS || daysLate > FINAL_AFTER_DAYS) return "final";
  if (daysLate >= FIRM_FROM_DAYS || history.length === 1) return "firm";
  return risk === "late_payer" ? "firm" : "gentle";
}

function dayCount(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"} late`;
}

function sentence(facts: string[]): string {
  if (facts.length <= 2) return facts.join(", and ");
  return `${facts.slice(0, -1).join(", ")}, and ${facts.at(-1)}`;
}

// The facts behind a suggestion, in words, so the card and the queue say the same thing.
export function toneReason(
  tone: Tone,
  daysLate: number,
  remindersSent: number,
  lateness: Lateness | null,
): string {
  const facts: string[] = [];
  if (tone === "final" && remindersSent >= FINAL_AFTER_REMINDERS) {
    facts.push(
      remindersSent === 2
        ? "two reminders already sent"
        : `${remindersSent} reminders already sent`,
    );
  } else {
    facts.push(dayCount(daysLate));
    if (remindersSent === 1) facts.push("one reminder already sent");
    if (tone !== "final" && lateness?.level === "late_payer") {
      facts.push(`late on ${lateness.lateCount} of ${lateness.invoicesConsidered} invoices`);
    }
  }
  return `Suggested ${tone}: ${sentence(facts)}.`;
}
