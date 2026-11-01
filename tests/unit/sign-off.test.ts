import { describe, expect, it } from "vitest";
import { SIGN_OFF_ROOM, withSignOff } from "@/lib/reminders/sign-off";
import { REMINDER_LIMITS } from "@/lib/reminders/check-reminder";
import { EMPTY_PROFILE, type Profile } from "@/types";

const riya: Profile = { ...EMPTY_PROFILE, yourName: "Riya Sharma" };
const body = "Hi Okafor team,\n\nInvoice INV-0044 is overdue.";

describe("withSignOff", () => {
  it("ends with the sign-off and the name on the next line", () => {
    expect(withSignOff(body, riya)).toBe(`${body}\n\nThank you,\nRiya Sharma`);
  });

  it("uses the sign-off from the profile", () => {
    expect(withSignOff(body, { ...riya, signOff: "Best regards" })).toBe(
      `${body}\n\nBest regards,\nRiya Sharma`,
    );
  });

  it("writes only the sign-off when there is no name, and never invents one", () => {
    expect(withSignOff(body, EMPTY_PROFILE)).toBe(`${body}\n\nThank you`);
  });

  it("does not close twice when the body already ends with a thank you", () => {
    expect(withSignOff(`${body}\n\nThank you`, riya)).toBe(`${body}\n\nThank you,\nRiya Sharma`);
    expect(withSignOff(`${body}\n\nThanks,`, riya)).toBe(`${body}\n\nThank you,\nRiya Sharma`);
  });

  it("keeps a thank you that is part of a sentence", () => {
    const sentence = "Thank you for your patience. Invoice INV-0044 is overdue.";
    expect(withSignOff(sentence, EMPTY_PROFILE)).toBe(`${sentence}\n\nThank you`);
  });

  it("adds the business name on its own line when it differs from the name", () => {
    const both = { ...riya, businessName: "Riya Sharma Design" };
    expect(withSignOff(body, both)).toBe(`${body}

Thank you,
Riya Sharma
Riya Sharma Design`);
  });

  it("does not repeat a business name that is the name again", () => {
    expect(withSignOff(body, { ...riya, businessName: "riya sharma" })).toBe(
      `${body}

Thank you,
Riya Sharma`,
    );
  });

  it("writes a business name alone when there is no personal name", () => {
    expect(withSignOff(body, { ...EMPTY_PROFILE, businessName: "Riya Sharma Design" })).toBe(
      `${body}

Thank you,
Riya Sharma Design`,
    );
  });

  it("leaves room for the longest sign-off, name and business name the profile allows", () => {
    const longest = withSignOff("", {
      ...EMPTY_PROFILE,
      yourName: "n".repeat(60),
      businessName: "b".repeat(120),
      signOff: "s".repeat(40),
    });
    expect(longest.length).toBeLessThanOrEqual(SIGN_OFF_ROOM);
    expect(REMINDER_LIMITS.message.max - SIGN_OFF_ROOM).toBeGreaterThan(
      REMINDER_LIMITS.message.min,
    );
  });
});
