import { describe, expect, it } from "vitest";
import { speakersOf, stripChatPrefixes } from "@/lib/ai/chat-prefix";

describe("stripChatPrefixes", () => {
  it("removes the iOS prefix with a 12 hour time", () => {
    expect(stripChatPrefixes("[28/10/26, 9:14 PM] Lena Fischer: Hi!")).toBe("Lena Fischer: Hi!");
  });

  it("removes the Android prefix with a 24 hour time", () => {
    expect(stripChatPrefixes("28/10/2026, 21:14 - Lena Fischer: Hi!")).toBe("Lena Fischer: Hi!");
  });

  it("accepts a narrow no-break space before AM or PM, and seconds", () => {
    expect(stripChatPrefixes("[28/10/2026, 9:14:05\u202fPM] Lena: Hi")).toBe("Lena: Hi");
    expect(stripChatPrefixes("[1/2/26, 10:05\u00a0am] Lena: Hi")).toBe("Lena: Hi");
  });

  it("removes the mark iOS puts before a line", () => {
    expect(stripChatPrefixes("\u200e[28/10/26, 9:14 PM] Lena: Hi")).toBe("Lena: Hi");
  });

  it("strips every line and leaves lines without a prefix alone", () => {
    const chat = [
      "[28/10/26, 9:14 PM] Lena: Hi",
      "a second line of the same message",
      "28/10/26, 21:16 - Riya: Sure",
    ].join("\n");
    expect(stripChatPrefixes(chat)).toBe("Lena: Hi\na second line of the same message\nRiya: Sure");
  });

  it("leaves a date in the middle of a message alone", () => {
    const line = "Lena: Pay by 28/10/26, 21:14 - or so";
    expect(stripChatPrefixes(line)).toBe(line);
  });

  it("only ever shortens a line, so a quote from it is still in the original chat", () => {
    const chat = "[28/10/26, 9:22 PM] Lena Fischer (Kraftwerk Studio): Can we do 50% now?";
    expect(chat).toContain(stripChatPrefixes(chat));
  });
});

describe("speakersOf", () => {
  it("lists who writes, with the company in brackets, once each", () => {
    const chat = [
      "[28/10/26, 9:14 PM] Lena Fischer (Kraftwerk Studio): Hi",
      "[28/10/26, 9:20 PM] Riya: Sure",
      "[28/10/26, 9:22 PM] Lena Fischer (Kraftwerk Studio): Perfect",
    ].join("\n");
    expect(speakersOf(chat)).toEqual([
      { person: "Lena Fischer", company: "Kraftwerk Studio" },
      { person: "Riya", company: null },
    ]);
  });
});
