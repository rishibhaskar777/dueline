import "server-only";
import { loadSummaries } from "./load-summaries";

// A new story is dated from the day it was seeded, so its payments fall on dates whose ECB rates are
// not stored yet. Working every rupee figure out once fetches and stores them, so the first screen
// opened afterwards finds them and does not wait for the rate service.
export async function warmPayoutRates(): Promise<void> {
  try {
    await loadSummaries(true);
  } catch {
    console.warn("Warming the payout rates failed");
  }
}
