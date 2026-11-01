import { describe, expect, it } from "vitest";
import {
  automationOf,
  toAutomationForm,
  toAutomationSettings,
} from "@/components/settings/automation-form";
import { formFromRepeat } from "@/components/invoices/invoice-form";
import { searchClients } from "@/components/clients/client-search";
import { searchInvoices } from "@/components/receivables/invoice-table-model";
import {
  settingsSchema,
  DEFAULT_SETTINGS,
  type ClientSummary,
  type RepeatSchedule,
  type Settings,
} from "@/types";
import { OKAFOR, openInvoice } from "../support/summaries";

describe("the automation settings form", () => {
  it("round-trips the settings", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      remindAfterDays: 5,
      rateAlerts: [{ currency: "EUR", direction: "below", threshold: 100 }],
    };
    const form = toAutomationForm(settings);
    expect(form.remindAfterDays).toBe("5");
    expect(form.alerts[0]).toMatchObject({ currency: "EUR", threshold: "100" });
    expect(toAutomationSettings(form)).toEqual({ ok: true, settings: automationOf(settings) });
  });

  it.each(["0", "61", "2.5", "", "abc"])("refuses %s days", (days) => {
    const form = { ...toAutomationForm(DEFAULT_SETTINGS), remindAfterDays: days };
    expect(toAutomationSettings(form)).toMatchObject({ ok: false });
  });

  it.each(["", "0", "-5", "1000", "much"])("refuses an alert rate of %s", (threshold) => {
    const form = toAutomationForm(DEFAULT_SETTINGS);
    form.alerts = [{ key: "a", currency: "USD", direction: "above", threshold }];
    expect(toAutomationSettings(form)).toMatchObject({ ok: false });
  });

  it("allows three alerts and no more", () => {
    const row = (key: string) =>
      ({ key, currency: "USD", direction: "above", threshold: "96" }) as const;
    const form = toAutomationForm(DEFAULT_SETTINGS);
    expect(toAutomationSettings({ ...form, alerts: [row("a"), row("b"), row("c")] }).ok).toBe(true);
    expect(
      toAutomationSettings({ ...form, alerts: [row("a"), row("b"), row("c"), row("d")] }).ok,
    ).toBe(false);
  });
});

describe("the settings schema", () => {
  it("accepts the defaults and refuses a fourth alert", () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
    const alert = { currency: "USD", direction: "above", threshold: 96 };
    expect(
      settingsSchema.safeParse({ ...DEFAULT_SETTINGS, rateAlerts: [alert, alert, alert, alert] })
        .success,
    ).toBe(false);
  });

  it("prepares drafts each morning, after 3 days, by default", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      prepareReminders: true,
      remindAfterDays: 3,
      rateAlerts: [],
    });
  });
});

describe("formFromRepeat", () => {
  const repeat: RepeatSchedule = {
    id: "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c",
    clientKey: "halden-coffee-co",
    clientName: "Halden Coffee Co.",
    clientEmail: "buyer@personal.example.com",
    currency: "USD",
    items: [
      { name: "Retainer", quantity: 1, unitAmount: "500.00", sac: "998391" },
      { name: "Extra", quantity: 2, unitAmount: "45.00", sac: null },
    ],
    purposeCode: "P1099",
    includeLutNote: true,
    dayOfMonth: 1,
    nextOn: "2026-12-01",
    paused: false,
  };

  it("fills the client, items, currency, purpose code and LUT, and leaves the due date to choose", () => {
    const form = formFromRepeat(repeat, "998000");
    expect(form).toMatchObject({
      clientName: "Halden Coffee Co.",
      clientEmail: "buyer@personal.example.com",
      currency: "USD",
      dueOn: "",
      purposeCode: "P1099",
      includeLutNote: true,
      discountOn: false,
    });
    expect(
      form.items.map(({ name, quantity, unitAmount, sac }) => [name, quantity, unitAmount, sac]),
    ).toEqual([
      ["Retainer", "1", "500.00", "998391"],
      ["Extra", "2", "45.00", "998000"],
    ]);
  });
});

describe("searching the card lists", () => {
  it("finds invoices by number, client, work or date, needing every word", () => {
    const invoice = openInvoice("2026-11-20", OKAFOR);
    expect(searchInvoices([invoice], "okafor")).toEqual([invoice]);
    expect(searchInvoices([invoice], "brand guidelines")).toEqual([invoice]);
    expect(searchInvoices([invoice], invoice.number.toLowerCase())).toEqual([invoice]);
    expect(searchInvoices([invoice], "okafor nonsense")).toEqual([]);
    expect(searchInvoices([invoice], "  ")).toEqual([invoice]);
  });

  it("finds clients by name or by the radar's reason", () => {
    const client = {
      key: "okafor-reyes",
      name: "Okafor & Reyes",
      riskReason: "Paid 2 of 3 invoices late.",
    } as ClientSummary;
    expect(searchClients([client], "reyes")).toEqual([client]);
    expect(searchClients([client], "paid late")).toEqual([client]);
    expect(searchClients([client], "brightwell")).toEqual([]);
  });
});
