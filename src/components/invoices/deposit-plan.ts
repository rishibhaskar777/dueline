import { addDays } from "@/lib/date-math";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import { splitTotal } from "@/lib/money/split";
import type { CreateSplitRequest, Money, PayoutEstimate } from "@/types";
import { calculateTotals, toRequest, type FieldErrors, type InvoiceForm } from "./invoice-form";

export const DEPOSIT_DUE_DAYS = 7;

export interface DepositPlan {
  percent: number;
  deposit: Money;
  balance: Money;
  depositDueOn: string;
  balanceDueOn: string;
}

// The whole percent asked for upfront, or null when it is off or the custom value is not 1 to 99.
export function upfrontPercent(form: InvoiceForm): number | null {
  if (form.upfront === "off") return null;
  const percent =
    form.upfront === "custom" ? Number(form.upfrontCustom.trim()) : Number(form.upfront);
  const valid = form.upfront !== "custom" || form.upfrontCustom.trim() !== "";
  return valid && Number.isInteger(percent) && percent >= 1 && percent <= 99 ? percent : null;
}

export function depositDueOf(form: InvoiceForm, today: string): string {
  return form.depositDueOn || addDays(today, DEPOSIT_DUE_DAYS);
}

export function balanceDueOf(form: InvoiceForm): string {
  return form.balanceDueOn || form.dueOn;
}

// The two amounts, worked out from the item lines; null while the split is off or the lines are not
// complete. The deposit is rounded to the cent and the balance is the rest.
export function depositPlan(form: InvoiceForm, today: string): DepositPlan | null {
  const percent = upfrontPercent(form);
  const totals = calculateTotals({ ...form, discountOn: false });
  if (percent === null || !totals || !today) return null;
  const amounts = splitTotal(toMinorUnits(totals.total.value), percent);
  if (!amounts) return null;
  const money = (minor: number): Money => ({
    currency: form.currency,
    value: fromMinorUnits(minor),
  });
  return {
    percent,
    deposit: money(amounts.depositMinor),
    balance: money(amounts.balanceMinor),
    depositDueOn: depositDueOf(form, today),
    balanceDueOn: balanceDueOf(form),
  };
}

type SplitRequestResult =
  { ok: true; request: CreateSplitRequest } | { ok: false; errors: FieldErrors };

// The split request is the usual draft check plus the percent and the two due dates.
export function toSplitRequest(
  form: InvoiceForm,
  ids: { requestId: string; balanceRequestId: string },
  today: string | undefined,
): SplitRequestResult {
  const checked = toRequest({ ...form, discountOn: false }, ids.requestId, today);
  const errors: FieldErrors = checked.ok ? {} : { ...checked.errors };
  const percent = upfrontPercent(form);
  if (percent === null) errors.upfrontCustom = "Use a whole percent from 1 to 99";

  const depositDueOn = today ? depositDueOf(form, today) : form.depositDueOn;
  const balanceDueOn = balanceDueOf(form);
  if (today && depositDueOn < today) errors.depositDueOn = "Choose today or a later date";
  if (today && balanceDueOn < today) errors.balanceDueOn = "Choose today or a later date";
  if (!checked.ok || percent === null || Object.keys(errors).length > 0)
    return { ok: false, errors };

  const { requestId, draft } = checked.request;
  return {
    ok: true,
    request: {
      draft,
      requestId,
      balanceRequestId: ids.balanceRequestId,
      split: { percent, depositDueOn, balanceDueOn },
    },
  };
}

// What reaches the bank from the two invoices together, and how much less that is than one invoice
// for the whole amount: PayPal's fixed fee is charged on each invoice. Null until both are known.
export function splitPayoutNote(
  deposit: PayoutEstimate | null,
  balance: PayoutEstimate | null,
  whole: PayoutEstimate | null,
): { combinedInr: number; extraFeeInr: number } | null {
  if (!deposit || !balance) return null;
  const combinedInr = deposit.netInr + balance.netInr;
  return { combinedInr, extraFeeInr: whole ? Math.max(0, whole.netInr - combinedInr) : 0 };
}
