import type { InvoiceSummary, Profile } from "@/types";
import { daysUntilDue, isNotYetDue } from "./overdue";

// An invoice is up for a heads-up when it is sent and unpaid, falls due within the profile's days
// (today counts) and has not had one yet. With the setting off nothing is.
export function isHeadsUpDue(
  invoice: InvoiceSummary,
  history: readonly { tone: string }[],
  profile: Pick<Profile, "sendHeadsUp" | "headsUpDays">,
  today: string,
): boolean {
  if (!profile.sendHeadsUp || !isNotYetDue(invoice)) return false;
  if (history.some(({ tone }) => tone === "heads_up")) return false;
  const days = daysUntilDue(invoice, today);
  return days >= 0 && days <= profile.headsUpDays;
}
