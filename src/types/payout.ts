import type { CurrencyCode, Money } from "./money";

export type RateSource = "ecb" | "manual";

export interface PayoutEstimate {
  gross: Money;
  fee: Money;
  net: Money;
  conversionRate: number;
  marketRate: number;
  marketRateDate: string;
  marketRateSource: RateSource;
  netInr: number;
  lossInr: number;
  lossPercent: number;
}

export interface MarketRate {
  value: number;
  onDate: string;
  source: RateSource;
}

export interface MarketRates {
  rates: Record<CurrencyCode, number>;
  onDate: string;
  source: RateSource;
}
