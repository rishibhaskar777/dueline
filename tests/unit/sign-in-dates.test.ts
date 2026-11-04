import { describe, expect, it } from "vitest";
import { sampleInvoiceDates } from "@/components/demo/sign-in-dates";

describe("the sample invoice on the sign-in page", () => {
  it("was sent 15 days ago and is due in 2 days", () => {
    expect(sampleInvoiceDates("2026-11-04")).toEqual({ sent: "20 Oct", due: "6 Nov" });
  });

  it("moves with the day, across a month and a year end", () => {
    expect(sampleInvoiceDates("2026-12-30")).toEqual({ sent: "15 Dec", due: "1 Jan" });
  });
});
