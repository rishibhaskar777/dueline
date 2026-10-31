import { describe, expect, it } from "vitest";
import { inBatches } from "@/lib/in-batches";

describe("inBatches", () => {
  it("keeps the results in the order of the items", async () => {
    const results = await inBatches([1, 2, 3, 4, 5], 2, async (n) => n * 10);
    expect(results).toEqual([10, 20, 30, 40, 50]);
  });

  it("runs no more than the batch size at once", async () => {
    let running = 0;
    let peak = 0;
    await inBatches([1, 2, 3, 4, 5], 2, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await Promise.resolve();
      running -= 1;
    });
    expect(peak).toBe(2);
  });

  it("returns nothing for no items", async () => {
    expect(await inBatches([], 3, async (n: number) => n)).toEqual([]);
  });

  it("stops at the first failure", async () => {
    const seen: number[] = [];
    await expect(
      inBatches([1, 2, 3, 4], 2, async (n) => {
        seen.push(n);
        if (n === 2) throw new Error("failed");
      }),
    ).rejects.toThrow("failed");
    expect(seen).toEqual([1, 2]);
  });
});
