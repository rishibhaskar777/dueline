import "server-only";
import { z } from "zod";
import { currencySchema, type CurrencyCode } from "@/types";

const RATES_URL =
  "https://api.frankfurter.dev/v2/rates?base=EUR&quotes=INR,USD,GBP,CAD,AUD&providers=ECB";
const TIMEOUT_MS = 8_000;
const DECIMALS = 10_000;

export class RatesUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RatesUnavailableError";
  }
}

const responseSchema = z.array(
  z.object({ date: z.iso.date(), quote: z.string(), rate: z.number().positive() }),
);

export interface EcbRates {
  onDate: string;
  rates: Record<CurrencyCode, number>;
}

async function fetchBody(): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(RATES_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new RatesUnavailableError("The exchange-rate service did not answer in time.");
  }
  if (!response.ok) {
    throw new RatesUnavailableError(`The exchange-rate service answered ${response.status}.`);
  }
  try {
    return await response.json();
  } catch {
    throw new RatesUnavailableError("The exchange-rate service sent something unreadable.");
  }
}

export async function fetchEcbRates(): Promise<EcbRates> {
  const parsed = responseSchema.safeParse(await fetchBody());
  if (!parsed.success) {
    throw new RatesUnavailableError("The exchange-rate service sent rates in an unexpected shape.");
  }

  const perEuro = new Map(parsed.data.map((row) => [row.quote, row.rate]));
  const rupeesPerEuro = perEuro.get("INR");
  if (rupeesPerEuro === undefined) {
    throw new RatesUnavailableError("The exchange-rate service sent no rate for rupees.");
  }

  const rates = {} as Record<CurrencyCode, number>;
  for (const currency of currencySchema.options) {
    const euroRate = currency === "EUR" ? 1 : perEuro.get(currency);
    if (euroRate === undefined) {
      throw new RatesUnavailableError(`The exchange-rate service sent no rate for ${currency}.`);
    }
    rates[currency] = Math.round((rupeesPerEuro / euroRate) * DECIMALS) / DECIMALS;
  }

  const onDate = parsed.data.map((row) => row.date).sort()[0];
  return { onDate, rates };
}
