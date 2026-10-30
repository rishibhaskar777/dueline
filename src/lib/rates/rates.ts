import "server-only";
import { today } from "@/lib/clock";
import { getStore } from "@/lib/store";
import { z } from "zod";
import { marketRatesSchema, type MarketRates, type Settings } from "@/types";
import { fetchEcbRates, type EcbRates } from "./ecb";

const HISTORICAL_TTL_SECONDS = 365 * 24 * 60 * 60;

const storedRatesSchema = z.object({ onDate: z.iso.date(), rates: marketRatesSchema });

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
