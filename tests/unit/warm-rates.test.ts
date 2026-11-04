import { beforeEach, describe, expect, it, vi } from "vitest";
import { warmPayoutRates } from "@/lib/payouts/warm-rates";

const summaries = vi.hoisted(() => ({ loadSummaries: vi.fn() }));
vi.mock("@/lib/payouts/load-summaries", () => ({ loadSummaries: summaries.loadSummaries }));

beforeEach(() => {
  summaries.loadSummaries.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("warmPayoutRates", () => {
  it("works out every invoice's rupees, hidden ones included, so each rate date is stored", async () => {
    summaries.loadSummaries.mockResolvedValue([]);
    await warmPayoutRates();
    expect(summaries.loadSummaries).toHaveBeenCalledWith(true);
  });

  it("never fails the reset or the morning run that asked for it", async () => {
    summaries.loadSummaries.mockRejectedValue(new Error("rate service down"));
    await expect(warmPayoutRates()).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith("Warming the payout rates failed");
  });
});
