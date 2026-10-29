import type { Money } from "./money";

export interface PayoutEstimate {
  gross: Money;
  fee: Money;
  net: Money;
  conversionRate: number;
  marketRate: number;
  netInr: number;
  lossInr: number;
  lossPercent: number;
}
