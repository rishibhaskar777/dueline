import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchEcbSeries } from "@/lib/rates/ecb";
import { getRatesWidget } from "@/lib/rates/rates";
import { rateLines } from "@/lib/rates/rate-trend";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { currencySchema, DEFAULT_SETTINGS, type Settings } from "@/types";
import { stubEnv } from "../support/env";
import { jsonResponse } from "../support/http";
import { ecbResponse } from "../support/rates";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));

const CURRENCIES = currencySchema.options;

// Rupees per euro on the given dates; USD is 1.2 per euro, so USD in rupees is rupeesPerEuro / 1.2.
function seriesRows(days: Record<string, number>): unknown[] {
  return Object.entries(days).flatMap(([date, inr]) =>
    [
      ["INR", inr],
      ["USD", 1.2],
      ["GBP", 0.8],
      ["CAD", 1.6],
      ["AUD", 1.8],
    ].map(([quote, rate]) => ({ date, base: "EUR", quote, rate })),
  );
}

const SERIES = seriesRows({ "2026-10-23": 102, "2026-11-04": 105.6 });

function isSeriesRequest(input: RequestInfo | URL): boolean {
  return new URL(String(input)).searchParams.has("from");
}

const ecb: Settings = { ...DEFAULT_SETTINGS, rateSource: "ecb" };

beforeEach(() => {
  stubEnv({ DEMO_TODAY: "2026-11-05" });
  holder.store = createMemoryStore();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("fetchEcbSeries", () => {
  it("asks for the range and returns one set of rates per date, oldest first", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(SERIES));
    const series = await fetchEcbSeries("2026-10-06", "2026-11-05");

    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.searchParams.get("from")).toBe("2026-10-06");
    expect(url.searchParams.get("to")).toBe("2026-11-05");
    expect(url.searchParams.get("providers")).toBe("ECB");
    expect(series.map(({ onDate }) => onDate)).toEqual(["2026-10-23", "2026-11-04"]);
    expect(series.map(({ rates }) => rates.USD)).toEqual([85, 88]);
  });
});

describe("rateLines", () => {
  it("compares the latest rate with the average of the series", () => {
    const widget = rateLines(
      [
        {
          onDate: "2026-10-23",
          rates: { USD: 85, EUR: 102, GBP: 127.5, CAD: 63.75, AUD: 56.6667 },
        },
        { onDate: "2026-11-04", rates: { USD: 88, EUR: 105.6, GBP: 132, CAD: 66, AUD: 58.6667 } },
      ],
      CURRENCIES,
    );
    expect(widget).toMatchObject({ onDate: "2026-11-04", source: "ecb", hasAverage: true });
    expect(widget.lines.find(({ currency }) => currency === "USD")).toEqual({
      currency: "USD",
      rate: 88,
      percentVsAverage: 1.7,
    });
  });

  it("reports a rate below its average as negative", () => {
    const rates = { USD: 90, EUR: 100, GBP: 100, CAD: 100, AUD: 100 };
    const widget = rateLines(
      [
        { onDate: "2026-10-23", rates },
        { onDate: "2026-11-04", rates: { ...rates, USD: 80 } },
      ],
      ["USD"],
    );
    expect(widget.lines[0].percentVsAverage).toBe(-5.9);
  });

  it("has no average from a single day", () => {
    const widget = rateLines(
      [{ onDate: "2026-11-04", rates: { USD: 88, EUR: 1, GBP: 1, CAD: 1, AUD: 1 } }],
      ["USD"],
    );
    expect(widget).toMatchObject({ hasAverage: false });
    expect(widget.lines[0].percentVsAverage).toBeNull();
  });
});

describe("getRatesWidget", () => {
  it("fetches the history once a day and then reads it from the store", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(SERIES));

    const first = await getRatesWidget(ecb);
    const second = await getRatesWidget(ecb);

    expect(first).toEqual(second);
    expect(first.hasAverage).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to today's rates alone when the history cannot be read", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      isSeriesRequest(input) ? new Response("down", { status: 503 }) : ecbResponse("2026-11-04"),
    );

    const widget = await getRatesWidget(ecb);

    expect(widget).toMatchObject({ onDate: "2026-11-04", source: "ecb", hasAverage: false });
    expect(widget.lines.find(({ currency }) => currency === "USD")).toEqual({
      currency: "USD",
      rate: 85,
      percentVsAverage: null,
    });
  });

  it("shows the rates typed in by hand without asking the ECB for history", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const widget = await getRatesWidget({ ...DEFAULT_SETTINGS, rateSource: "manual" });

    expect(widget).toMatchObject({ source: "manual", hasAverage: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});
