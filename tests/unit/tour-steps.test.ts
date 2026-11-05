import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tourSteps, type TourContext } from "@/components/dashboard/tour-steps";
import { BRIGHTWELL, openInvoice, OKAFOR, overdueInvoice, paidInvoice } from "../support/summaries";

const TODAY = "2026-11-04";

const context: TourContext = {
  today: TODAY,
  invoices: [
    paidInvoice("2026-09-01", "2026-09-02", BRIGHTWELL),
    overdueInvoice("2026-10-20", 15, OKAFOR),
    overdueInvoice("2026-10-30", 5, BRIGHTWELL),
    openInvoice("2026-11-20", BRIGHTWELL),
  ],
  hasReadyToSend: true,
};

const hrefOf = (title: string, given: Partial<TourContext> = {}): string | undefined =>
  tourSteps({ ...context, ...given }).find((step) => step.title === title)?.href;

describe("tourSteps", () => {
  const steps = tourSteps(context);

  it("has the README's judge path word for word, in order", () => {
    const readme = readFileSync("README.md", "utf8");
    const path = readme.slice(readme.indexOf("**A two-minute path through every feature**"));
    const listed = [...path.matchAll(/^\d+\. \*\*(.+?)\*\* (.+)$/gm)].map(([, title, text]) => ({
      title,
      text,
    }));

    expect(listed.length).toBeGreaterThanOrEqual(steps.length);
    expect(listed.slice(0, steps.length)).toEqual(
      steps.map(({ title, text }) => ({ title, text })),
    );
  });

  it("links each step to the place it is about", () => {
    expect(steps.map(({ href }) => href)).toEqual([
      "/receivables#due-line-title",
      "/clients/by-key/okafor-reyes",
      "/invoices/new?sample=1",
      "/receivables#ready-title",
      "/nudges",
      "/export?month=2026-10",
      "/settings",
      "/demo-tools",
    ]);
  });

  it("opens the export register on the month before today's, also across a new year", () => {
    expect(hrefOf("Export register.", { today: "2027-01-09" })).toBe("/export?month=2026-12");
  });

  it("opens the late client furthest behind, whoever it is in the data", () => {
    const other = overdueInvoice("2026-10-01", 34, BRIGHTWELL);
    expect(hrefOf("Clients behind.", { invoices: [...context.invoices, other] })).toBe(
      "/clients/by-key/brightwell-labs",
    );
  });

  it("ignores late invoices that were paid, and opens the client list when nobody is late", () => {
    const quiet = [paidInvoice("2026-10-01", "2026-10-09"), openInvoice("2026-11-20")];
    expect(hrefOf("Clients behind.", { invoices: quiet })).toBe("/clients");
  });

  it("goes to Ready to send only when a balance is waiting there, otherwise to the sample chat", () => {
    expect(hrefOf("Deposit and balance.")).toBe("/receivables#ready-title");
    expect(hrefOf("Deposit and balance.", { hasReadyToSend: false })).toBe(
      "/invoices/new?sample=1",
    );
  });

  it("links only to places inside the app", () => {
    for (const { href } of steps) expect(href).toMatch(/^\/[a-z]/);
  });
});
