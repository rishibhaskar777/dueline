import { describe, expect, it } from "vitest";
import { isSnapshotOld } from "@/components/shared/snapshot-age";

const now = Date.parse("2026-10-17T10:00:00Z");

describe("isSnapshotOld", () => {
  it("is false for invoices read a few minutes ago", () => {
    expect(isSnapshotOld("2026-10-17T09:56:00Z", now)).toBe(false);
  });

  it("is true once they are more than five minutes old", () => {
    expect(isSnapshotOld("2026-10-17T09:54:00Z", now)).toBe(true);
  });

  it("is false when the server did not say, or said something unreadable", () => {
    expect(isSnapshotOld(null, now)).toBe(false);
    expect(isSnapshotOld("yesterday", now)).toBe(false);
  });
});
