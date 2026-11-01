import type { CurrencyCode } from "./money";
import type { RateAlert } from "./automation";
import type { RateSource } from "./payout";

export interface Settings {
  feePercent: number;
  fixedFees: Record<CurrencyCode, string>;
  fxMarkupPercent: number;
  rateSource: RateSource;
  marketRates: Record<CurrencyCode, number>;
  ratesUpdatedOn: string;
  prepareReminders: boolean;
  remindAfterDays: number;
  rateAlerts: RateAlert[];
}

// PayPal India's published fees for international commercial payments, checked 29 Oct 2026.
// The market rates are ECB reference rates of 29 Oct 2026, a last resort when neither a live
// ECB fetch nor a saved rate is available.
export const DEFAULT_SETTINGS: Settings = {
  feePercent: 4.4,
  fixedFees: { USD: "0.30", EUR: "0.35", GBP: "0.20", CAD: "0.30", AUD: "0.30" },
  fxMarkupPercent: 3.0,
  rateSource: "ecb",
  marketRates: { USD: 95.27, EUR: 106.03, GBP: 126.87, CAD: 68.07, AUD: 66.93 },
  ratesUpdatedOn: "2026-10-29",
  prepareReminders: true,
  remindAfterDays: 3,
  rateAlerts: [],
};
