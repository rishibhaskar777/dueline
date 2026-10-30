import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchEcbRates, RatesUnavailableError } from "@/lib/rates/ecb";
import { jsonResponse } from "../support/http";
import { ECB_RATES, ecbResponse, ecbRows } from "../support/rates";

afterEach(() => vi.restoreAllMocks());

describe("fetchEcbRates", () => {
  it("turns euro rates into rupees per unit", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(ecbResponse("2026-10-28"));
    expect(await fetchEcbRates()).toEqual({ onDate: "2026-10-28", rates: ECB_RATES });
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://api.frankfurter.dev/v2/rates");
    expect(url.searchParams.get("base")).toBe("EUR");
    expect(url.searchParams.get("providers")).toBe("ECB");
  });

  it("asks for the rates of a given date", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(ecbResponse("2026-10-23"));
    expect((await fetchEcbRates("2026-10-24")).onDate).toBe("2026-10-23");
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.searchParams.get("date")).toBe("2026-10-24");
    expect(url.searchParams.get("providers")).toBe("ECB");
  });

  it("reports the oldest date when the rows disagree", async () => {
    const rows = ecbRows("2026-10-28") as { date: string }[];
    rows[1].date = "2026-10-27";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(rows));
    expect((await fetchEcbRates()).onDate).toBe("2026-10-27");
  });

  it("rejects an answer without the rupee rate", async () => {
    const rows = (ecbRows() as { quote: string }[]).filter((row) => row.quote !== "INR");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(rows));
    await expect(fetchEcbRates()).rejects.toThrow(RatesUnavailableError);
  });

  it("rejects an answer without one of the currencies", async () => {
    const rows = (ecbRows() as { quote: string }[]).filter((row) => row.quote !== "CAD");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(rows));
    await expect(fetchEcbRates()).rejects.toThrow("CAD");
  });

  it("rejects an HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, { status: 500 }));
    await expect(fetchEcbRates()).rejects.toThrow(RatesUnavailableError);
  });

  it("rejects a timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await expect(fetchEcbRates()).rejects.toThrow(RatesUnavailableError);
  });

  it("rejects an answer that is not the expected shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ rates: { INR: 100 } }));
    await expect(fetchEcbRates()).rejects.toThrow(RatesUnavailableError);
  });

  it("rejects an answer that is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>"));
    await expect(fetchEcbRates()).rejects.toThrow(RatesUnavailableError);
  });
});
