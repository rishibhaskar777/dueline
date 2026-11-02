import { describe, expect, it, vi } from "vitest";
import { retryOnce } from "@/lib/store/retry-once";

describe("retryOnce", () => {
  it("returns the first answer without a second call", async () => {
    const task = vi.fn().mockResolvedValue("ok");
    expect(await retryOnce(task, 0)).toBe("ok");
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("tries again once after a failure, as a sleeping database needs", async () => {
    const task = vi
      .fn()
      .mockRejectedValueOnce(new Error("connect timeout"))
      .mockResolvedValue("ok");
    expect(await retryOnce(task, 0)).toBe("ok");
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second failure", async () => {
    const task = vi.fn().mockRejectedValue(new Error("down"));
    await expect(retryOnce(task, 0)).rejects.toThrow("down");
    expect(task).toHaveBeenCalledTimes(2);
  });
});
