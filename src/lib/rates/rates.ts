import "server-only";
import { today } from "@/lib/clock";
import { getStore } from "@/lib/store";
import type { MarketRates, Settings } from "@/types";
import { fetchEcbRates, type EcbRates } from "./ecb";

let inFlight: Promise<MarketRates | null> | undefined;

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
