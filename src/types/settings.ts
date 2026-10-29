import type { CurrencyCode } from "./money";

export interface Settings {
  feePercent: number;
  fixedFee: string;
  fxMarkupPercent: number;
  rateSource: "ecb" | "manual";
  marketRates: Record<CurrencyCode, number>;
  ratesUpdatedOn: string;
}
