import type { Money } from "@/types";

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatRupees(amount: number): string {
  return rupees.format(amount);
}

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: money.currency }).format(
    Number(money.value),
  );
}

export function formatRate(rate: number, digits = 4): string {
  return rate.toFixed(digits);
}
