import { describe, expect, it, vi } from "vitest";
import { afterResponse } from "@/lib/after-response";

describe("afterResponse", () => {
  it("starts the work at once when there is no request to wait for", async () => {
    const work = vi.fn().mockResolvedValue(undefined);
    afterResponse(work);
    await vi.waitFor(() => expect(work).toHaveBeenCalledTimes(1));
  });
});
