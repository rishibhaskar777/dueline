import { describe, expect, it } from "vitest";
import {
  blankForm,
  formFromDraft,
  lutIsCurrent,
  lutIssue,
} from "@/components/invoices/invoice-form";
import { extraction } from "@/mocks/fixtures";
import { EMPTY_PROFILE, type Profile } from "@/types";

const TODAY = "2026-11-04";

const withLut: Profile = {
  ...EMPTY_PROFILE,
  lutArn: "AD2904260012345",
  lutValidUntil: "2027-03-31",
};

describe("lutIsCurrent", () => {
  it("is true for an ARN whose LUT has not run out", () => {
    expect(lutIsCurrent(withLut, TODAY)).toBe(true);
  });

  it("is true on the last day of the LUT", () => {
    expect(lutIsCurrent({ ...withLut, lutValidUntil: TODAY }, TODAY)).toBe(true);
  });

  it("is false once the LUT has expired", () => {
    expect(lutIsCurrent({ ...withLut, lutValidUntil: "2026-11-03" }, TODAY)).toBe(false);
  });

  it("is false without an ARN, without a date, or before the profile is known", () => {
    expect(lutIsCurrent(EMPTY_PROFILE, TODAY)).toBe(false);
    expect(lutIsCurrent({ ...withLut, lutArn: null }, TODAY)).toBe(false);
    expect(lutIsCurrent({ ...withLut, lutValidUntil: null }, TODAY)).toBe(false);
    expect(lutIsCurrent(null, TODAY)).toBe(false);
  });
});

describe("the LUT line on a new invoice", () => {
  it("starts ticked for a profile with a current LUT, on a blank form and on a drafted one", () => {
    const ticked = lutIsCurrent(withLut, TODAY);
    expect(blankForm("998391", ticked).includeLutNote).toBe(true);
    expect(formFromDraft(extraction.draft, ticked).includeLutNote).toBe(true);
    expect(
      formFromDraft({ ...extraction.draft, includeLutNote: false }, ticked).includeLutNote,
    ).toBe(true);
  });

  it("starts unticked for an expired LUT and for no LUT", () => {
    const expired = lutIsCurrent({ ...withLut, lutValidUntil: "2026-03-31" }, TODAY);
    const none = lutIsCurrent(EMPTY_PROFILE, TODAY);
    for (const ticked of [expired, none]) {
      expect(blankForm("", ticked).includeLutNote).toBe(false);
      expect(
        formFromDraft({ ...extraction.draft, includeLutNote: false }, ticked).includeLutNote,
      ).toBe(false);
    }
  });

  it("stays off by default, so nothing is ticked without a profile", () => {
    expect(blankForm().includeLutNote).toBe(false);
  });

  it("keeps a draft that already asks for the line", () => {
    expect(formFromDraft({ ...extraction.draft, includeLutNote: true }, false).includeLutNote).toBe(
      true,
    );
  });

  it("warns about an expired LUT only when the user ticks the line", () => {
    const expired = { ...withLut, lutValidUntil: "2026-03-31" };
    expect(lutIssue(expired, false, TODAY)).toBeNull();
    expect(lutIssue(expired, true, TODAY)).toBe("expired");
  });
});
