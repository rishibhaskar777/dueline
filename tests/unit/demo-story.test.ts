import { describe, expect, it } from "vitest";
import { addDays, daysBetween } from "@/lib/date-math";
import {
  buildDemoProfile,
  buildDemoStory,
  demoMemo,
  isDemoMemo,
  isDemoProfile,
  storyMarkerOf,
  type DemoInvoice,
} from "@/lib/demo/story";
import { markerOf } from "@/lib/paypal/memo";
import { scoreClient } from "@/lib/risk/score";
import type { InvoiceSummary } from "@/types";

const TODAY = "2026-10-31";
const GENERATION = 3;
const story = buildDemoStory(TODAY);

function summaryOf(invoice: DemoInvoice): InvoiceSummary {
  const dueState = invoice.paidOn ? "paid" : TODAY > invoice.dueOn ? "overdue" : "on_time";
  return {
    id: invoice.key,
    number: invoice.key,
    client: { name: invoice.clientName, email: "buyer@personal.example.com" },
    work: invoice.work,
    amount: invoice.amount,
    issuedOn: invoice.issuedOn,
    dueOn: invoice.dueOn,
    paidOn: invoice.paidOn,
    paypalStatus: invoice.paidOn ? "MARKED_AS_PAID" : "UNPAID",
    dueState,
    daysLate: 0,
    payoutInr: null,
    payoutSource: null,
    rateDate: null,
    actualPayout: null,
    purposeCode: invoice.purposeCode,
    payLink: "",
    riskLevel: null,
  };
}

function levelOf(clientName: string): string {
  const invoices = story.filter((invoice) => invoice.clientName === clientName).map(summaryOf);
  return scoreClient(invoices, TODAY).level;
}

describe("buildDemoStory", () => {
  it("gives every invoice its own key and memo", () => {
    const keys = story.map((invoice) => invoice.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(keys.map((key) => demoMemo(GENERATION, key))).size).toBe(keys.length);
    expect(isDemoMemo(demoMemo(GENERATION, keys[0]))).toBe(true);
    expect(isDemoMemo("dueline-request:abc")).toBe(false);
    expect(isDemoMemo(undefined)).toBe(false);
  });

  it("places every date relative to the day it is built for", () => {
    const next = buildDemoStory("2026-11-14");
    story.forEach((invoice, index) => {
      expect(daysBetween(invoice.issuedOn, next[index].issuedOn)).toBe(14);
      expect(daysBetween(invoice.dueOn, next[index].dueOn)).toBe(14);
    });
  });

  it("records Okafor & Reyes' two older invoices as paid 12 and 16 days after they fell due", () => {
    const older = story.filter(
      (invoice) => invoice.clientName === "Okafor & Reyes" && invoice.paidOn,
    );
    expect(older.map((invoice) => daysBetween(invoice.issuedOn, TODAY))).toEqual([75, 45]);
    expect(older.map((invoice) => daysBetween(invoice.dueOn, invoice.paidOn ?? ""))).toEqual([
      12, 16,
    ]);
  });

  it("never records a payment before the invoice was issued or after today", () => {
    for (const invoice of story.filter((item) => item.paidOn)) {
      expect(daysBetween(invoice.issuedOn, invoice.paidOn ?? "")).toBeGreaterThan(0);
      expect(daysBetween(invoice.paidOn ?? "", TODAY)).toBeGreaterThanOrEqual(0);
    }
  });

  it("leaves Northpine Studio due soon and Tandem Health on time", () => {
    const due = (name: string): string =>
      story.find((invoice) => invoice.clientName === name)?.dueOn ?? "";
    expect(daysBetween(TODAY, due("Northpine Studio"))).toBe(3);
    expect(daysBetween(TODAY, due("Tandem Health"))).toBeGreaterThan(3);
  });

  it("makes Okafor & Reyes a late payer, Brightwell Labs a watch and Halden Coffee Co. reliable", () => {
    expect(levelOf("Okafor & Reyes")).toBe("late_payer");
    expect(levelOf("Brightwell Labs")).toBe("watch");
    expect(levelOf("Halden Coffee Co.")).toBe("reliable");
  });

  it("gives Halden Coffee Co. two invoices paid ahead of their due dates", () => {
    const halden = story.filter((invoice) => invoice.clientName === "Halden Coffee Co.");
    expect(halden.map((invoice) => invoice.work)).toEqual(["Menu redesign", "Loyalty card design"]);
    const loyalty = halden[1];
    expect(loyalty.amount).toEqual({ currency: "USD", value: "180.00" });
    expect(daysBetween(loyalty.issuedOn, TODAY)).toBe(14);
    expect(loyalty.dueOn).toBe(TODAY);
    expect(daysBetween(loyalty.paidOn ?? "", TODAY)).toBe(4);
  });

  it("puts every client in a country", () => {
    const countries = Object.fromEntries(story.map((item) => [item.clientName, item.country]));
    expect(countries).toEqual({
      "Okafor & Reyes": "PT",
      "Halden Coffee Co.": "US",
      "Brightwell Labs": "GB",
      "Northpine Studio": "CA",
      "Tandem Health": "US",
    });
  });

  it("chases the Okafor & Reyes website copy once, gently, three days after it fell due", () => {
    const withReminder = story.filter((item) => item.reminder);
    expect(withReminder.map((item) => item.work)).toEqual(["Website copy"]);
    expect(withReminder[0].reminder).toEqual({
      tone: "gentle",
      sentOn: addDays(withReminder[0].dueOn, 3),
    });
  });
});

describe("the story marker", () => {
  it("carries the generation and the key, and the memo's first word is the marker", () => {
    const memo = demoMemo(4, "tandem-pitch-deck", "P1099", "998391");
    expect(markerOf(memo)).toBe("dueline-demo:4:tandem-pitch-deck");
    expect(storyMarkerOf(markerOf(memo))).toEqual({ generation: 4, key: "tandem-pitch-deck" });
  });

  it("reads a marker from before generations as generation 0", () => {
    expect(storyMarkerOf("dueline-demo:okafor-website-copy")).toEqual({
      generation: 0,
      key: "okafor-website-copy",
    });
    expect(isDemoMemo("dueline-demo:okafor-website-copy P1099")).toBe(true);
  });

  it("is not a story marker for anything else", () => {
    expect(storyMarkerOf("dueline-request:abc")).toBeNull();
    expect(storyMarkerOf("")).toBeNull();
  });
});

describe("isDemoProfile", () => {
  it("accepts the demo profile with an older LUT date and nothing a person typed", () => {
    const old = { ...buildDemoProfile("2025-06-01") };
    expect(isDemoProfile(old, TODAY)).toBe(true);
    expect(isDemoProfile({ ...old, yourName: "Asha Rao" }, TODAY)).toBe(false);
  });
});
