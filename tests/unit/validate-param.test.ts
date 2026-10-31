import { describe, expect, it } from "vitest";
import { parseParam } from "@/app/api/_lib/validate";
import { clientKeySchema, invoiceIdSchema } from "@/types";

describe("parseParam", () => {
  it("returns the checked value", () => {
    expect(parseParam("INV2-1", "id", invoiceIdSchema)).toEqual({ ok: true, data: "INV2-1" });
  });

  it("returns what the schema makes of the value", () => {
    expect(parseParam("caf%C3%A9", "key", clientKeySchema)).toEqual({ ok: true, data: "café" });
  });

  it("answers 400 invalid_request naming the segment", async () => {
    const parsed = parseParam("A".repeat(101), "id", invoiceIdSchema);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.response.status).toBe(400);
    const { error } = await parsed.response.json();
    expect(error.code).toBe("invalid_request");
    expect(error.message).toMatch(/^id: /);
  });
});
