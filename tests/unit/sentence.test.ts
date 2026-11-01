import { describe, expect, it } from "vitest";
import { endSentence } from "@/lib/sentence";

describe("endSentence", () => {
  it("adds a full stop to a name that does not end in one", () => {
    expect(endSentence("Other clients are merged into Okafor & Reyes")).toBe(
      "Other clients are merged into Okafor & Reyes.",
    );
  });

  it("does not double the full stop of a name like Halden Coffee Co.", () => {
    expect(endSentence("Other clients are merged into Halden Coffee Co.")).toBe(
      "Other clients are merged into Halden Coffee Co.",
    );
  });

  it("leaves other sentence endings alone", () => {
    expect(endSentence("Really?")).toBe("Really?");
  });
});
