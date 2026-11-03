import type { RiskLevel } from "@/types";

export type RiskTone = "late" | "watch" | "reliable" | "new";

// A client with no level yet has no history to judge, so it reads as new.
export function riskTone(level: RiskLevel | null): RiskTone {
  switch (level) {
    case "late_payer":
      return "late";
    case "watch":
      return "watch";
    case "reliable":
      return "reliable";
    case "new":
    case null:
      return "new";
  }
}

export const AVATAR_CLASSES: Record<RiskTone, string> = {
  late: "bg-tint-red text-late",
  watch: "bg-tint-amber text-due-soon",
  reliable: "bg-tint-green text-paid",
  new: "bg-tint-blue text-blue",
};

// The full-width strip under a client's name; a client without a level has none, and a new client
// has one only to say how few invoices there are.
export function reasonStripClasses(level: RiskLevel | null): string | null {
  return level === null ? null : AVATAR_CLASSES[riskTone(level)];
}
