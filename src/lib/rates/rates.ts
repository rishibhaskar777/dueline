import "server-only";
import { addDays, today } from "@/lib/clock";
import { getStore } from "@/lib/store";
import type { Json } from "@/lib/store/store";
import { z } from "zod";
import {
  currencySchema,
  marketRatesSchema,
  type MarketRates,
  type RatesWidget,
  type Settings,
} from "@/types";
import { fetchEcbRates, fetchEcbSeries, type EcbRates } from "./ecb";
import { rateLines } from "./rate-trend";

const HISTORICAL_TTL_SECONDS = 365 * 24 * 60 * 60;
const TREND_DAYS = 30;
const TREND_TTL_SECONDS = 24 * 60 * 60;

const storedRatesSchema = z.object({ onDate: z.iso.date(), rates: marketRatesSchema });

const ratesWidgetSchema = z.object({
  onDate: z.iso.date(),
  source: z.enum(["ecb", "manual"]),
  hasAverage: z.boolean(),
  lines: z.array(
    z.object({
      currency: currencySchema,
      rate: z.number().positive(),
      percentVsAverage: z.number().nullable(),
    }),
  ),
});

let inFlight: Promise<MarketRates | null> | undefined;

function historicalKey(date: string): string {
  return `ecb-rates:${date}`;
}

function manualRates(settings: Settings): MarketRates {
  return { rates: settings.marketRates, onDate: settings.ratesUpdatedOn, source: "manual" };
}

async function refreshEcbRates(): Promise<MarketRates | null> {
  let fetched: EcbRates;
  try {
    fetched = await fetchEcbRates();
  } catch (error) {
    console.warn("Could not fetch ECB rates", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return null;
  }

  try {
    await getStore().putRates({ ...fetched, fetchedOn: today() });
  } catch {
    console.warn("Could not store ECB rates");
  }
  return { ...fetched, source: "ecb" };
}

function sharedRefresh(): Promise<MarketRates | null> {
  inFlight ??= refreshEcbRates().finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

async function storedEcbRates(): Promise<{ market: MarketRates; fetchedOn: string } | null> {
  try {
    const stored = await getStore().getLatestRates();
    if (!stored) return null;
    return {
      market: { rates: stored.rates, onDate: stored.onDate, source: "ecb" },
      fetchedOn: stored.fetchedOn,
    };
  } catch {
    return null;
  }
}

export async function getMarketRates(settings: Settings): Promise<MarketRates> {
  if (settings.rateSource === "manual") return manualRates(settings);

  const stored = await storedEcbRates();
  if (stored?.fetchedOn === today()) return stored.market;

  const fresh = await sharedRefresh();
  return fresh ?? stored?.market ?? manualRates(settings);
}

async function storedRatesOn(date: string): Promise<EcbRates | null> {
  try {
    const parsed = storedRatesSchema.safeParse(await getStore().getCached(historicalKey(date)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function fetchRatesOn(date: string): Promise<EcbRates | null> {
  try {
    const fetched = await fetchEcbRates(date);
    const value = { onDate: fetched.onDate, rates: { ...fetched.rates } };
    await getStore()
      .putCached(historicalKey(date), value, HISTORICAL_TTL_SECONDS)
      .catch(() => console.warn("Could not store ECB rates for a past date"));
    return fetched;
  } catch (error) {
    console.warn("Could not fetch ECB rates for a past date", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return null;
  }
}

// The ECB's rates for a past date never change, so each date is fetched once and then read from the
// store. The answer says which date and source were used: the ECB publishes nothing on weekends, so
// its date can be earlier than the one asked for, and when it cannot be reached the rates in use
// today stand in.
export async function getRatesOn(date: string, settings: Settings): Promise<MarketRates> {
  if (settings.rateSource === "manual" || date >= today()) return getMarketRates(settings);

  const found = (await storedRatesOn(date)) ?? (await fetchRatesOn(date));
  return found ? { ...found, source: "ecb" } : getMarketRates(settings);
}

function trendKey(date: string): string {
  return `ecb-rate-trend:${date}`;
}

async function storedTrend(date: string): Promise<RatesWidget | null> {
  try {
    const parsed = ratesWidgetSchema.safeParse(await getStore().getCached(trendKey(date)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function fetchTrend(date: string): Promise<RatesWidget | null> {
  try {
    const series = await fetchEcbSeries(addDays(date, -TREND_DAYS), date);
    if (series.length === 0) return null;
    const widget = rateLines(series, currencySchema.options);
    await getStore()
      .putCached(trendKey(date), JSON.parse(JSON.stringify(widget)) as Json, TREND_TTL_SECONDS)
      .catch(() => console.warn("Could not store the rate trend"));
    return widget;
  } catch (error) {
    console.warn("Could not fetch the ECB rate history", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return null;
  }
}

// Today's rate of each currency against the average of the last 30 days, fetched once a day. When
// the history cannot be had, or the rates are typed in by hand, it is today's rates alone.
export async function getRatesWidget(settings: Settings): Promise<RatesWidget> {
  if (settings.rateSource === "ecb") {
    const date = today();
    const trend = (await storedTrend(date)) ?? (await fetchTrend(date));
    if (trend) return trend;
  }
  const market = await getMarketRates(settings);
  return {
    ...rateLines([{ onDate: market.onDate, rates: market.rates }], currencySchema.options),
    source: market.source,
  };
}
