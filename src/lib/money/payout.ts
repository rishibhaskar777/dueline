import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import type { MarketRate, Money, PayoutEstimate, Settings } from "@/types";

const RATE_SCALE = 10_000;
const PERCENT_SCALE = 100;
const PERCENT_DENOMINATOR = BigInt(100 * PERCENT_SCALE);
const RATE_DENOMINATOR = BigInt(RATE_SCALE);
const MINOR_PER_UNIT = BigInt(100);

// Scaling through a 12-digit string keeps 88.12345 * 10000 from landing just below the .5.
function scaled(value: number, scale: number): bigint {
  return BigInt(Math.round(Number((value * scale).toPrecision(12))));
}

function divideRoundingHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * BigInt(2) + denominator) / (denominator * BigInt(2));
}

function roundRate(rate: number): number {
  return Number(scaled(rate, RATE_SCALE)) / RATE_SCALE;
}

export function paypalRateFor(marketRate: number, fxMarkupPercent: number): number {
  const market = scaled(marketRate, RATE_SCALE);
  const keep = PERCENT_DENOMINATOR - scaled(fxMarkupPercent, PERCENT_SCALE);
  return Number(divideRoundingHalfUp(market * keep, PERCENT_DENOMINATOR)) / RATE_SCALE;
}

function toRupees(minorUnits: bigint, rate: number): bigint {
  return divideRoundingHalfUp(
    minorUnits * scaled(rate, RATE_SCALE),
    MINOR_PER_UNIT * RATE_DENOMINATOR,
  );
}

export function convertToInr(net: Money, conversionRate: number): number {
  return Number(toRupees(BigInt(Math.max(0, toMinorUnits(net.value))), conversionRate));
}

// Rupees to the paisa, for figures a tax return takes with two decimals.
export function convertToPaise(amount: Money, conversionRate: number): number {
  const minorUnits = BigInt(Math.max(0, toMinorUnits(amount.value)));
  return Number(
    divideRoundingHalfUp(minorUnits * scaled(conversionRate, RATE_SCALE), RATE_DENOMINATOR),
  );
}

export function estimatePayout(
  amount: Money,
  settings: Settings,
  rate: MarketRate,
): PayoutEstimate {
  const gross = BigInt(toMinorUnits(amount.value));
  const percentFee = divideRoundingHalfUp(
    gross * scaled(settings.feePercent, PERCENT_SCALE),
    PERCENT_DENOMINATOR,
  );
  const fee = percentFee + BigInt(toMinorUnits(settings.fixedFees[amount.currency]));
  const net = fee < gross ? gross - fee : BigInt(0);

  const marketRate = roundRate(rate.value);
  const conversionRate = paypalRateFor(marketRate, settings.fxMarkupPercent);
  const netInr = toRupees(net, conversionRate);
  const marketValue = toRupees(gross, marketRate);
  const lossInr = marketValue - netInr;
  const lossPercent =
    marketValue === BigInt(0)
      ? 0
      : Number(divideRoundingHalfUp(lossInr * BigInt(1000), marketValue)) / 10;

  return {
    gross: amount,
    fee: { currency: amount.currency, value: fromMinorUnits(Number(fee)) },
    net: { currency: amount.currency, value: fromMinorUnits(Number(net)) },
    conversionRate,
    marketRate,
    marketRateDate: rate.onDate,
    marketRateSource: rate.source,
    netInr: Number(netInr),
    lossInr: Number(lossInr),
    lossPercent,
  };
}
