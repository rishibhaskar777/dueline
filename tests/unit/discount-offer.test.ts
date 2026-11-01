import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { discountFieldsFor, useDiscountOffer } from "@/components/invoices/use-discount-offer";
import { blankForm } from "@/components/invoices/invoice-form";

const SUGGESTION = { kind: "early_payment_discount", percent: 2, withinDays: 7 } as const;

// Runs the hook inside a component, which is all it needs: it keeps no state of its own.
function runHook(
  ...args: Parameters<typeof useDiscountOffer>
): ReturnType<typeof useDiscountOffer> {
  let result: ReturnType<typeof useDiscountOffer> | undefined;
  function Probe() {
    result = useDiscountOffer(...args);
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  if (!result) throw new Error("The hook did not run.");
  return result;
}

describe("discountFieldsFor", () => {
  it("switches the discount on with the suggested percent and days as text", () => {
    expect(discountFieldsFor(SUGGESTION)).toEqual({
      discountOn: true,
      discountPercent: "2",
      discountDays: "7",
    });
  });
});

describe("useDiscountOffer", () => {
  const off = { discountOn: false, discountPercent: "2", discountDays: "7" };

  it("offering fills the one discount control and switches it on", () => {
    const update = vi.fn();
    const { applied, offer } = runHook(off, SUGGESTION, update);

    expect(applied).toBe(false);
    offer();
    expect(update).toHaveBeenCalledWith({
      discountOn: true,
      discountPercent: "2",
      discountDays: "7",
    });
  });

  it("reads the control back: it is applied once it holds the suggestion", () => {
    const form = { discountOn: true, discountPercent: "2", discountDays: "7" };
    expect(runHook(form, SUGGESTION, vi.fn()).applied).toBe(true);
    expect(runHook({ ...form, discountPercent: "2.0" }, SUGGESTION, vi.fn()).applied).toBe(true);
  });

  it("is not applied when the control is off or holds other figures", () => {
    expect(runHook(off, SUGGESTION, vi.fn()).applied).toBe(false);
    const other = { discountOn: true, discountPercent: "5", discountDays: "7" };
    expect(runHook(other, SUGGESTION, vi.fn()).applied).toBe(false);
  });

  it("does nothing without a suggestion", () => {
    const update = vi.fn();
    const { applied, offer } = runHook(off, null, update);
    offer();
    expect(applied).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("fits the form's own fields, so the discount section shows what was offered", () => {
    const form = { ...blankForm(), ...discountFieldsFor(SUGGESTION) };
    expect(runHook(form, SUGGESTION, vi.fn()).applied).toBe(true);
  });
});
