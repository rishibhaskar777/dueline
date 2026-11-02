import { describe, expect, it } from "vitest";
import { NAV_TABS, activeTabIndex } from "@/components/layout/nav-tabs";

function activeLabel(pathname: string): string | null {
  const index = activeTabIndex(pathname);
  return index === null ? null : NAV_TABS[index].label;
}

describe("the main tabs", () => {
  it("are Home, New invoice, Clients, Nudges and Export register, in that order", () => {
    expect(NAV_TABS.map((tab) => [tab.label, tab.href])).toEqual([
      ["Home", "/receivables"],
      ["New invoice", "/invoices/new"],
      ["Clients", "/clients"],
      ["Nudges", "/nudges"],
      ["Export register", "/export"],
    ]);
  });
});

describe("activeTabIndex", () => {
  it("puts Receivables and an invoice's own page under Home", () => {
    expect(activeLabel("/receivables")).toBe("Home");
    expect(activeLabel("/invoices/INV2-ABCD-1234")).toBe("Home");
  });

  it("puts the new invoice page under New invoice, not Home", () => {
    expect(activeLabel("/invoices/new")).toBe("New invoice");
  });

  it("puts the client list and a client's page under Clients", () => {
    expect(activeLabel("/clients")).toBe("Clients");
    expect(activeLabel("/clients/by-key/okafor")).toBe("Clients");
  });

  it("gives Nudges and Export register their own tabs", () => {
    expect(activeLabel("/nudges")).toBe("Nudges");
    expect(activeLabel("/export")).toBe("Export register");
  });

  it("gives no tab to Profile, Fees and rates and Demo tools", () => {
    expect(activeTabIndex("/profile")).toBeNull();
    expect(activeTabIndex("/settings")).toBeNull();
    expect(activeTabIndex("/demo-tools")).toBeNull();
  });

  it("does not match a path that only starts with a tab's letters", () => {
    expect(activeTabIndex("/clients-old")).toBeNull();
    expect(activeTabIndex("/exports")).toBeNull();
  });
});
