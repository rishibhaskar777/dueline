export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

export interface Money {
  currency: CurrencyCode;
  value: string;
}
