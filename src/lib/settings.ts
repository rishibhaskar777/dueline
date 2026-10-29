import "server-only";
import { today } from "@/lib/clock";
import { getMarketRates } from "@/lib/rates/rates";
import { getStore } from "@/lib/store";
import {
  DEFAULT_SETTINGS,
  currencySchema,
  fixedFeesSchema,
  marketRatesSchema,
  settingsSchema,
  type MarketRates,
  type Settings,
} from "@/types";

const storedSchema = settingsSchema.partial().extend({
  fixedFees: fixedFeesSchema.partial().optional(),
  marketRates: marketRatesSchema.partial().optional(),
});

// A saved row from an older version may lack fields or have a different shape.
async function readStoredSettings(): Promise<Settings> {
  const parsed = storedSchema.safeParse(await getStore().getSettings());
  const stored = parsed.success ? parsed.data : {};
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    fixedFees: { ...DEFAULT_SETTINGS.fixedFees, ...stored.fixedFees },
    marketRates: { ...DEFAULT_SETTINGS.marketRates, ...stored.marketRates },
  };
}

export async function getSettingsAndRates(): Promise<{ settings: Settings; market: MarketRates }> {
  const stored = await readStoredSettings();
  const market = await getMarketRates(stored);
  const settings: Settings =
    stored.rateSource === "ecb"
      ? { ...stored, marketRates: market.rates, ratesUpdatedOn: market.onDate }
      : stored;
  return { settings, market };
}

export async function getSettings(): Promise<Settings> {
  return (await getSettingsAndRates()).settings;
}

export async function saveSettings(input: Settings): Promise<Settings> {
  const next = settingsSchema.parse(input);
  const current = await readStoredSettings();
  const ratesChanged = currencySchema.options.some(
    (currency) => next.marketRates[currency] !== current.marketRates[currency],
  );
  const saved: Settings = {
    ...next,
    ratesUpdatedOn: next.rateSource === "manual" && ratesChanged ? today() : next.ratesUpdatedOn,
  };
  await getStore().saveSettings(saved);
  return getSettings();
}
