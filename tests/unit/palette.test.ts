import { describe, expect, it } from "vitest";
import { buildCommands } from "@/components/palette/palette-commands";
import { shortcutFor } from "@/components/palette/shortcuts";
import { filterByQuery } from "@/lib/search";
import type { ClientSummary } from "@/types";
import { BRIGHTWELL, OKAFOR, openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

const clients = [
  { key: "okafor-reyes", name: "Okafor & Reyes" },
  { key: "brightwell-labs", name: "Brightwell Labs" },
] as ClientSummary[];

const late = overdueInvoice("2026-10-26", 5, OKAFOR);
const invoices = [
  late,
  paidInvoice("2026-10-01", "2026-10-02", BRIGHTWELL),
  openInvoice("2026-11-20"),
];

const commands = buildCommands({ invoices, clients });
const labels = (found: { label: string }[]) => found.map(({ label }) => label);

describe("filterByQuery", () => {
  const items = [
    { label: "Open client Okafor & Reyes" },
    { label: "Go to Clients", keywords: "customers" },
    { label: "Toggle theme", keywords: "dark light" },
  ];

  it("returns everything for an empty search", () => {
    expect(filterByQuery(items, "  ")).toEqual(items);
  });

  it("needs every word, in any order, ignoring case", () => {
    expect(labels(filterByQuery(items, "REYES client"))).toEqual(["Open client Okafor & Reyes"]);
    expect(filterByQuery(items, "client zzz")).toEqual([]);
  });

  it("finds an item by its hidden keywords", () => {
    expect(labels(filterByQuery(items, "dark"))).toEqual(["Toggle theme"]);
  });

  it("puts labels that start with the first word first, otherwise keeps the order", () => {
    expect(labels(filterByQuery(items, "client"))).toEqual([
      "Open client Okafor & Reyes",
      "Go to Clients",
    ]);
    expect(labels(filterByQuery(items, "go client"))).toEqual(["Go to Clients"]);
    expect(labels(filterByQuery(items, "to"))).toEqual(["Toggle theme", "Go to Clients"]);
  });
});

describe("the palette's commands", () => {
  it("goes to every page", () => {
    const pages = commands.filter(({ id }) => id.startsWith("page:"));
    expect(pages.map(({ action }) => action)).toContainEqual({ kind: "go", href: "/invoices/new" });
    expect(labels(filterByQuery(commands, "new invoice"))[0]).toBe("Go to New invoice");
  });

  it("toggles the theme", () => {
    const [toggle] = filterByQuery(commands, "toggle theme");
    expect(toggle.action).toEqual({ kind: "toggle-theme" });
  });

  it("opens a client by typing part of the name", () => {
    const [found] = filterByQuery(commands, "brightw");
    expect(found.action).toEqual({ kind: "go", href: "/clients/by-key/brightwell-labs" });
  });

  it("opens an invoice by its number or its client", () => {
    const byNumber = filterByQuery(commands, late.number).find(({ id }) =>
      id.startsWith("invoice:"),
    );
    expect(byNumber?.action).toEqual({
      kind: "go",
      href: `/invoices/${encodeURIComponent(late.id)}`,
    });
    expect(filterByQuery(commands, "okafor invoice").map(({ id }) => id)).toContain(
      `invoice:${late.id}`,
    );
  });

  it("offers a reminder only for an overdue invoice, linked to its Nudges card", () => {
    const reminders = filterByQuery(commands, "draft a reminder");
    expect(reminders).toHaveLength(1);
    expect(reminders[0].label).toBe("Draft a reminder for Okafor & Reyes");
    expect(reminders[0].action).toEqual({
      kind: "go",
      href: `/nudges#invoice-${encodeURIComponent(late.id)}`,
    });
  });

  it("has pages and actions before the clients and invoices have loaded", () => {
    const early = buildCommands({ invoices: [], clients: [] });
    expect(early.length).toBeGreaterThan(5);
    expect(early.every(({ id }) => id.startsWith("page:") || id.startsWith("action:"))).toBe(true);
  });
});

describe("shortcutFor", () => {
  const press = (key: string, extra: Partial<Parameters<typeof shortcutFor>[0]> = {}) =>
    shortcutFor({ key, ctrlKey: false, metaKey: false, altKey: false, target: null, ...extra });

  it("opens the palette with Ctrl+K or Cmd+K, in either case", () => {
    expect(press("k", { ctrlKey: true })).toBe("palette");
    expect(press("K", { metaKey: true })).toBe("palette");
    expect(press("k")).toBeNull();
    expect(press("k", { ctrlKey: true, altKey: true })).toBeNull();
  });

  it("opens the list of shortcuts with a question mark", () => {
    expect(press("?")).toBe("shortcuts");
  });

  it("leaves the question mark alone while someone is typing", () => {
    expect(press("?", { target: { tagName: "INPUT" } })).toBeNull();
    expect(press("?", { target: { tagName: "TEXTAREA" } })).toBeNull();
    expect(press("?", { target: { tagName: "DIV", isContentEditable: true } })).toBeNull();
    expect(press("?", { target: { tagName: "BUTTON" } })).toBe("shortcuts");
  });

  it("still opens the palette from a text box", () => {
    expect(press("k", { ctrlKey: true, target: { tagName: "TEXTAREA" } })).toBe("palette");
  });
});
