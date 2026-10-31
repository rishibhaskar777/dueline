import type { RiskLevel, Tone } from "@/types";

const FIRM_FROM_DAYS = 8;
const FINAL_AFTER_DAYS = 20;

const FIRMER: Record<Tone, Tone> = { gentle: "firm", firm: "final", final: "final" };

// A late payer is chased one step firmer than the days alone call for; a client to watch is not.
export function suggestTone(
  daysLate: number,
  history: readonly unknown[],
  risk: RiskLevel | null,
): Tone {
  const base = toneForDays(daysLate, history);
  return risk === "late_payer" ? FIRMER[base] : base;
}

function toneForDays(daysLate: number, history: readonly unknown[]): Tone {
  if (daysLate > FINAL_AFTER_DAYS || history.length >= 2) return "final";
  if (daysLate >= FIRM_FROM_DAYS || history.length === 1) return "firm";
  return "gentle";
}
