import { describe, expect, it } from "vitest";
import {
  connectionStatus,
  dateLine,
  firstName,
  greeting,
  kolkataHour,
} from "@/components/receivables/home-header";
import type { HealthResponse } from "@/types";

const health: HealthResponse = {
  paypal: "connected",
  ai: "ready",
  storage: "memory",
  mode: "sandbox",
  offline: false,
  today: "2026-11-02",
  demoClock: false,
};

describe("greeting", () => {
  it("changes at noon and at five in the evening", () => {
    expect(greeting(0, null)).toBe("Good morning");
    expect(greeting(11, null)).toBe("Good morning");
    expect(greeting(12, null)).toBe("Good afternoon");
    expect(greeting(16, null)).toBe("Good afternoon");
    expect(greeting(17, null)).toBe("Good evening");
    expect(greeting(23, null)).toBe("Good evening");
  });

  it("adds the first word of the name", () => {
    expect(greeting(9, "Riya Sharma")).toBe("Good morning, Riya");
    expect(greeting(9, "  Riya  ")).toBe("Good morning, Riya");
  });

  it("leaves the name out when there is none", () => {
    expect(greeting(9, "")).toBe("Good morning");
    expect(greeting(9, "   ")).toBe("Good morning");
  });

  it("says Good day until the hour is known", () => {
    expect(greeting(null, null)).toBe("Good day");
  });
});

describe("firstName", () => {
  it("is the first word, or null for nothing", () => {
    expect(firstName("Riya Sharma")).toBe("Riya");
    expect(firstName("")).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});

describe("kolkataHour", () => {
  it("reads the hour in India, not in UTC", () => {
    expect(kolkataHour(new Date("2026-11-02T03:30:00Z"))).toBe(9);
    expect(kolkataHour(new Date("2026-11-02T18:29:00Z"))).toBe(23);
    expect(kolkataHour(new Date("2026-11-02T18:30:00Z"))).toBe(0);
  });
});

describe("dateLine", () => {
  it("names the weekday and the date", () => {
    expect(dateLine("2026-11-02", false)).toBe("Monday, 2 Nov 2026");
  });

  it("says so when the demo clock is on", () => {
    expect(dateLine("2026-11-02", true)).toBe("Monday, 2 Nov 2026 (demo date)");
  });
});

describe("connectionStatus", () => {
  it("says connected, simulated or not connected", () => {
    expect(connectionStatus(health)).toEqual({
      text: "PayPal sandbox connected",
      connected: true,
    });
    expect(connectionStatus({ ...health, offline: true })).toEqual({
      text: "Simulated PayPal sandbox",
      connected: true,
    });
    expect(connectionStatus({ ...health, paypal: "error" })).toEqual({
      text: "PayPal sandbox not connected",
      connected: false,
    });
  });
});
