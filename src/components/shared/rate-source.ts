import type { RateSource } from "@/types";

// Offline mode reports its rates as "manual", but nobody typed them in and the ECB was never asked,
// so every screen names them for what they are.
export const OFFLINE_RATES_LABEL = "Saved rates (offline demo)";

export function rateSourceLabel(source: RateSource, offline: boolean): string {
  if (offline) return OFFLINE_RATES_LABEL;
  return source === "ecb" ? "European Central Bank rates" : "Rates you set by hand";
}
