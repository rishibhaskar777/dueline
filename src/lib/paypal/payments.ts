import "server-only";
import { ApiError } from "@paypal/paypal-server-sdk";
import { addDays } from "@/lib/clock";
import { isOffline } from "@/lib/env";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import type { ActualPayout, Money } from "@/types";
import { isRecordedOutsidePayPal, latestPayment, PAYOUT_STATUSES, toMoney } from "./map";
import { offlineCapture } from "./offline/transport";
import { paymentsController, transactionSearchController } from "./sdk";
import type { PayPalInvoice } from "./types";

const SEARCH_WINDOW_DAYS = 15;

interface SdkMoney {
  currencyCode: string;
  value: string;
}

function sdkMoney(amount: SdkMoney | undefined): Money | null {
  return amount ? toMoney(amount.currencyCode, amount.value) : null;
}

function debugIdOf(error: unknown): string | undefined {
  if (error instanceof ApiError) return error.headers["paypal-debug-id"];
  return undefined;
}

function logFailure(source: string, error: unknown): void {
  console.warn("PayPal payout lookup failed", { source, debugId: debugIdOf(error) });
}

async function fromCapture(captureId: string): Promise<ActualPayout | null> {
  const { result } = await paymentsController().getCapturedPayment({ captureId });
  const breakdown = result.sellerReceivableBreakdown;
  const fee = sdkMoney(breakdown?.paypalFee);
  const net = sdkMoney(breakdown?.netAmount);
  if (!fee || !net) return null;

  const inRupees = breakdown?.receivableAmount?.currencyCode === "INR";
  const rate = breakdown?.exchangeRate;
  return {
    fee,
    net,
    exchangeRate: rate?.targetCurrency === "INR" && rate.value ? Number(rate.value) : null,
    netInr:
      inRupees && breakdown?.receivableAmount ? Number(breakdown.receivableAmount.value) : null,
    source: "paypal_capture",
    paidAt: result.createTime ?? null,
    transactionId: captureId,
  };
}

async function fromTransactionSearch(
  transactionId: string,
  paymentDate: string,
  gross: Money | null,
): Promise<ActualPayout | null> {
  const day = paymentDate.slice(0, 10);
  const { result } = await transactionSearchController().searchTransactions({
    transactionId,
    startDate: `${addDays(day, -SEARCH_WINDOW_DAYS)}T00:00:00Z`,
    endDate: `${addDays(day, SEARCH_WINDOW_DAYS)}T23:59:59Z`,
    fields: "transaction_info",
  });
  const info = result.transactionDetails?.[0]?.transactionInfo;
  const feeAmount = sdkMoney(info?.feeAmount);
  const total = gross ?? sdkMoney(info?.transactionAmount);
  if (!feeAmount || !total || feeAmount.currency !== total.currency) return null;

  // Transaction Search reports fees as negative amounts.
  const feeMinor = Math.abs(toMinorUnits(feeAmount.value));
  return {
    fee: { currency: total.currency, value: fromMinorUnits(feeMinor) },
    net: { currency: total.currency, value: fromMinorUnits(toMinorUnits(total.value) - feeMinor) },
    exchangeRate: null,
    netInr: null,
    source: "invoice_payment",
    paidAt: info?.transactionInitiationDate ?? null,
    transactionId,
  };
}

export async function getActualPayout(invoice: PayPalInvoice): Promise<ActualPayout | null> {
  if (!PAYOUT_STATUSES.includes(invoice.status) || isRecordedOutsidePayPal(invoice.status)) {
    return null;
  }
  const payment = latestPayment(invoice);
  if (!payment?.payment_id || !payment.payment_date) return null;
  if (isOffline()) return offlineCapture(payment.payment_id);

  try {
    const fromPayment = await fromCapture(payment.payment_id);
    if (fromPayment) return fromPayment;
  } catch (error) {
    logFailure("capture", error);
  }

  try {
    const gross = payment.amount
      ? toMoney(payment.amount.currency_code, payment.amount.value)
      : null;
    return await fromTransactionSearch(payment.payment_id, payment.payment_date, gross);
  } catch (error) {
    logFailure("transaction_search", error);
    return null;
  }
}
