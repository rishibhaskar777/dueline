import type { TriggeredRateAlert } from "./automation";
import type { CurrencyCode, Money } from "./money";
import type { RiskLevel } from "./risk";

export interface ForecastBucket {
  label: string;
  expectedInr: number;
  bestCaseInr: number;
  invoices: number;
}

export interface Forecast {
  buckets: ForecastBucket[];
  basis: string;
}

export interface FeesLost {
  financialYear: string;
  feesInr: number;
  conversionLossInr: number;
  lostInr: number;
  receivedInr: number;
  lostPer100: number;
}

export interface UpcomingDue {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  amount: Money;
  dueOn: string;
  payoutInr: number | null;
}

export interface LateClient {
  key: string;
  name: string;
  daysLate: number;
  overdueInr: number;
  riskLevel: RiskLevel | null;
  reason: string;
}

export interface RateLine {
  currency: CurrencyCode;
  rate: number;
  percentVsAverage: number | null;
}

export interface RatesWidget {
  onDate: string;
  source: "ecb" | "manual";
  hasAverage: boolean;
  lines: RateLine[];
}

export interface DashboardResponse {
  forecast: Forecast;
  feesLost: FeesLost;
  upcomingDue: UpcomingDue[];
  lateClients: LateClient[];
  rates: RatesWidget;
  rateAlerts: TriggeredRateAlert[];
}
