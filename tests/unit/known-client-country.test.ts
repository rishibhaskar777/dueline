import { describe, expect, it } from "vitest";
import { knownClientCountry } from "@/components/invoices/known-client-country";
import type { ClientSummary } from "@/types";

function summary(key: string, email: string, country: string | null): ClientSummary {
  return {
    key,
    name: key,
    email,
    country,
    paySpeed: null,
    riskLevel: null,
    riskReason: "",
    invoices: 1,
    billedInr: 0,
    outstandingInr: 0,
    averageDaysLate: 0,
    lastPaidOn: null,
  };
}

const clients = [
  summary("okafor-reyes", "buyer@personal.example.com", "PT"),
  summary("halden-coffee-co", "buyer@personal.example.com", "US"),
  summary("solo-studio", "hello@solo.example", "DE"),
  summary("no-country", "x@nocountry.example", null),
];

describe("knownClientCountry", () => {
  it("finds a client by name, ignoring case and spacing", () => {
    expect(knownClientCountry(clients, "  OKAFOR   & reyes ", "")).toBe("PT");
  });

  it("finds a client by an email only one client has", () => {
    expect(knownClientCountry(clients, "New name", "Hello@Solo.example")).toBe("DE");
  });

  it("does not guess from an email several clients share", () => {
    expect(knownClientCountry(clients, "Someone new", "buyer@personal.example.com")).toBeNull();
  });

  it("prefers the name over the email", () => {
    expect(knownClientCountry(clients, "Halden Coffee Co.", "hello@solo.example")).toBe("US");
  });

  it("has no country for a stranger or a client without one", () => {
    expect(knownClientCountry(clients, "Stranger", "")).toBeNull();
    expect(knownClientCountry(clients, "No country", "")).toBeNull();
  });
});
