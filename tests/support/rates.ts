import { jsonResponse } from "./http";

const RATES_HOST = "api.frankfurter.dev";

// Rupees per unit: USD 85, EUR 102, GBP 127.5, CAD 63.75, AUD 56.6667.
export function ecbRows(date = "2026-10-28"): unknown[] {
  return [
    ["INR", 102],
    ["USD", 1.2],
    ["GBP", 0.8],
    ["CAD", 1.6],
    ["AUD", 1.8],
  ].map(([quote, rate]) => ({ date, base: "EUR", quote, rate }));
}

export const ECB_RATES = { USD: 85, EUR: 102, GBP: 127.5, CAD: 63.75, AUD: 56.6667 };

export function ecbResponse(date?: string): Response {
  return jsonResponse(ecbRows(date));
}

export function isRatesRequest(url: URL): boolean {
  return url.host === RATES_HOST;
}
