import { formatDays } from "@/lib/format-days";
import type { LateClient } from "@/types";

// How late the client's most overdue open invoice is; nothing when no invoice of theirs is open and late.
export function latePill(client: LateClient): string | null {
  return client.daysLate > 0 ? `${formatDays(client.daysLate)} late` : null;
}

// e.g. "Late on 3 of 3 · 12 days on average"; the average is left out when there is none.
export function lateHistoryLine(client: LateClient): string {
  const counts = `Late on ${client.lateCount} of ${client.invoicesConsidered}`;
  return client.averageDaysLate > 0
    ? `${counts} · ${formatDays(client.averageDaysLate)} on average`
    : counts;
}
