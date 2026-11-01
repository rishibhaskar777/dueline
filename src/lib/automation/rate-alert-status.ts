import "server-only";
import { getSettingsAndRates } from "@/lib/settings";
import type { TriggeredRateAlert } from "@/types";
import { evaluateRateAlerts } from "./rate-alerts";

// The rates in use are the ECB's of the day, or the freelancer's own when they set them by hand.
export async function triggeredRateAlerts(): Promise<TriggeredRateAlert[]> {
  const { settings } = await getSettingsAndRates();
  return evaluateRateAlerts(settings.rateAlerts, settings.marketRates);
}
