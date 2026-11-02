import { describe, expect, it } from "vitest";
import { cardNote } from "@/components/clients/ClientCards";
import { searchClients, sortClients } from "@/components/clients/client-list";
import { offerSentence } from "@/components/clients/ReasonStrip";
import { AVATAR_CLASSES, reasonStripClasses, riskTone } from "@/components/shared/risk-tone";
import type { ClientSummary } from "@/types";

function client(changes: Partial<ClientSummary>): ClientSummary {
  return {
    key: "okafor-reyes",
    name: "Okafor & Reyes",
    email: "maya@okaforreyes.eu",
    country: "PT",
    paySpeed: null,
    riskLevel: null,
    riskReason: "",
    invoices: 3,
    billedInr: 0,
    outstandingInr: 0,
    averageDaysLate: 0,
    lastPaidOn: null,
    ...changes,
  };
}

describe("the clients list", () => {
  it("finds a client by name or by email, needing every word", () => {
    const okafor = client({});
    const brightwell = client({
      key: "brightwell",
      name: "Brightwell Labs",
      email: "ops@brightwell.example",
    });
    expect(searchClients([okafor, brightwell], "okaforreyes.eu")).toEqual([okafor]);
    expect(searchClients([okafor, brightwell], "brightwell ops")).toEqual([brightwell]);
    expect(searchClients([okafor, brightwell], "nobody")).toEqual([]);
    expect(searchClients([okafor, brightwell], " ")).toEqual([okafor, brightwell]);
  });

  it("puts the client owing most first, then orders by name", () => {
    const owing = client({ key: "b", name: "Brightwell Labs", outstandingInr: 70000 });
    const most = client({ key: "t", name: "Tandem Health", outstandingInr: 79000 });
    const none1 = client({ key: "h", name: "Halden Coffee Co." });
    const none2 = client({ key: "a", name: "Alder Studio" });
    const input = [none1, owing, none2, most];
    expect(sortClients(input).map(({ name }) => name)).toEqual([
      "Tandem Health",
      "Brightwell Labs",
      "Alder Studio",
      "Halden Coffee Co.",
    ]);
    expect(input[0]).toBe(none1);
  });

  it("says why the client is rated as they are, or else when they last paid", () => {
    expect(cardNote(client({ riskReason: "Late on 3 of 3 invoices." }))).toBe(
      "Late on 3 of 3 invoices.",
    );
    expect(cardNote(client({ lastPaidOn: "2026-10-16" }))).toBe("Last paid 16 Oct 2026.");
    expect(cardNote(client({}))).toBe("");
  });
});

describe("risk tones", () => {
  it("tints the avatar by level, blue when there is none", () => {
    expect(riskTone("late_payer")).toBe("late");
    expect(riskTone("watch")).toBe("watch");
    expect(riskTone("reliable")).toBe("reliable");
    expect(riskTone(null)).toBe("new");
    expect(AVATAR_CLASSES.late).toContain("tint-red");
    expect(AVATAR_CLASSES.reliable).toContain("tint-green");
    expect(AVATAR_CLASSES.watch).toContain("tint-amber");
    expect(AVATAR_CLASSES.new).toContain("tint-blue");
  });

  it("draws the reason strip in the level's tone, and none without a level", () => {
    expect(reasonStripClasses("late_payer")).toContain("text-late");
    expect(reasonStripClasses("watch")).toContain("text-due-soon");
    expect(reasonStripClasses("reliable")).toContain("text-paid");
    expect(reasonStripClasses(null)).toBeNull();
  });

  it("repeats the offer the radar suggests, and nothing when it suggests none", () => {
    expect(
      offerSentence({ suggestion: { kind: "early_payment_discount", percent: 2, withinDays: 7 } }),
    ).toBe("Dueline suggests a 2% early-payment offer if paid within 7 days.");
    expect(offerSentence({ suggestion: null })).toBeNull();
  });
});
