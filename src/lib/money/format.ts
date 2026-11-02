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

// Rupee rates are shown to the paisa; the full figure stays in the data and in editable fields.
export function formatRate(rate: number): string {
  return rate.toFixed(2);
}
