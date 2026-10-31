import { describe, expect, it } from "vitest";
import { hashRequestBody } from "@/lib/requests/body-hash";

describe("hashRequestBody", () => {
  it("gives the same hash whatever order the fields come in", () => {
    const a = { draft: { name: "Logo", items: [{ a: 1, b: 2 }] }, discount: { percent: 2 } };
    const b = { discount: { percent: 2 }, draft: { items: [{ b: 2, a: 1 }], name: "Logo" } };
    expect(hashRequestBody(a)).toBe(hashRequestBody(b));
  });

  it("ignores a field that is absent or undefined", () => {
    expect(hashRequestBody({ draft: 1, discount: undefined })).toBe(hashRequestBody({ draft: 1 }));
  });

  it("changes with any value, and keeps the order of a list", () => {
    expect(hashRequestBody({ percent: 2 })).not.toBe(hashRequestBody({ percent: 3 }));
    expect(hashRequestBody({ items: [1, 2] })).not.toBe(hashRequestBody({ items: [2, 1] }));
  });

  it("is a SHA-256 hex digest", () => {
    expect(hashRequestBody({ invoiceId: "INV2-1" })).toMatch(/^[0-9a-f]{64}$/);
  });
});
