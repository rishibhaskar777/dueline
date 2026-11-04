import { describe, expect, it } from "vitest";
import { toMinorUnits } from "@/lib/money/decimal";
import { estimatePayout } from "@/lib/money/payout";
import { DEFAULT_SETTINGS } from "@/types";
import {
  balanceDueOf,
  depositDueOf,
  depositPlan,
  splitPayoutNote,
  toSplitRequest,
  upfrontPercent,
} from "@/components/invoices/deposit-plan";
import { blankForm, withUpfront, type InvoiceForm } from "@/components/invoices/invoice-form";

const ids = {
  requestId: "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c",
  balanceRequestId: "9a1c7e52-0b3d-4f6a-8d2e-5c4b3a291807",
};

function kraftwerk(changes: Partial<InvoiceForm> = {}): InvoiceForm {
  const form = blankForm("998314");
  return {
    ...form,
    clientName: "Kraftwerk Studio",
    clientEmail: "buyer@personal.example.com",
    currency: "EUR",
    dueOn: "2026-11-30",
    items: [
      { key: "a", name: "Logo final files", quantity: "1", unitAmount: "400.00", sac: "998314" },
      {
        key: "b",
        name: "Business card designs",
        quantity: "2",
        unitAmount: "90.00",
        sac: "998314",
      },
      { key: "c", name: "Brand guideline PDF", quantity: "1", unitAmount: "650.00", sac: "998314" },
    ],
    ...changes,
  };
}

describe("withUpfront", () => {
  it("preselects 30 and 50, and opens Custom for any other whole percent", () => {
    expect(withUpfront(kraftwerk(), 50).upfront).toBe("50");
    expect(withUpfront(kraftwerk(), 30).upfront).toBe("30");
    expect(withUpfront(kraftwerk(), 40)).toMatchObject({ upfront: "custom", upfrontCustom: "40" });
    expect(withUpfront(kraftwerk(), null).upfront).toBe("off");
  });
});

describe("upfrontPercent", () => {
  it("is null when off or when the custom value is not a whole percent from 1 to 99", () => {
    expect(upfrontPercent(kraftwerk())).toBeNull();
    expect(upfrontPercent(kraftwerk({ upfront: "50" }))).toBe(50);
    expect(upfrontPercent(kraftwerk({ upfront: "custom", upfrontCustom: "25" }))).toBe(25);
    for (const bad of ["", "0", "100", "12.5", "abc"]) {
      expect(upfrontPercent(kraftwerk({ upfront: "custom", upfrontCustom: bad }))).toBeNull();
    }
  });
});

describe("depositPlan", () => {
  it("splits €1,230.00 into €615.00 and €615.00, due a week from today and on the invoice's date", () => {
    const plan = depositPlan(kraftwerk({ upfront: "50" }), "2026-11-04");
    expect(plan).toEqual({
      percent: 50,
      deposit: { currency: "EUR", value: "615.00" },
      balance: { currency: "EUR", value: "615.00" },
      depositDueOn: "2026-11-11",
      balanceDueOn: "2026-11-30",
    });
  });

  it("keeps the two amounts adding up for 33% of €1,000.01", () => {
    const form = kraftwerk({
      upfront: "custom",
      upfrontCustom: "33",
      items: [{ key: "a", name: "Work", quantity: "1", unitAmount: "1000.01", sac: "" }],
    });
    const plan = depositPlan(form, "2026-11-04");
    expect(plan?.deposit.value).toBe("330.00");
    expect(plan?.balance.value).toBe("670.01");
  });

  it("is off while the split is off or the items are incomplete", () => {
    expect(depositPlan(kraftwerk(), "2026-11-04")).toBeNull();
    expect(
      depositPlan(
        kraftwerk({
          upfront: "50",
          items: [{ key: "a", name: "Work", quantity: "1", unitAmount: "", sac: "" }],
        }),
        "2026-11-04",
      ),
    ).toBeNull();
  });

  it("uses the dates the user picked", () => {
    const form = kraftwerk({
      upfront: "30",
      depositDueOn: "2026-11-08",
      balanceDueOn: "2026-12-05",
    });
    expect(depositDueOf(form, "2026-11-04")).toBe("2026-11-08");
    expect(balanceDueOf(form)).toBe("2026-12-05");
  });
});

describe("toSplitRequest", () => {
  it("builds the request from the checked draft, the percent and both dates", () => {
    const result = toSplitRequest(
      kraftwerk({ upfront: "50", discountOn: true }),
      ids,
      "2026-11-04",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request).toMatchObject({
      requestId: ids.requestId,
      balanceRequestId: ids.balanceRequestId,
      split: { percent: 50, depositDueOn: "2026-11-11", balanceDueOn: "2026-11-30" },
    });
  });

  it("names the field when the custom percent or a date is wrong", () => {
    const bad = toSplitRequest(
      kraftwerk({ upfront: "custom", upfrontCustom: "150", depositDueOn: "2026-11-01" }),
      ids,
      "2026-11-04",
    );
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.errors.upfrontCustom).toBeTruthy();
    expect(bad.errors.depositDueOn).toBe("Choose today or a later date");
  });
});

describe("splitPayoutNote", () => {
  const rate = { value: 88, onDate: "2026-11-04", source: "ecb" as const };
  const whole = { currency: "EUR" as const, value: "1230.00" };

  it("charges the fixed fee on each invoice, so two invoices bring less than one", () => {
    const plan = depositPlan(kraftwerk({ upfront: "50" }), "2026-11-04");
    if (!plan) throw new Error("no plan");
    const deposit = estimatePayout(plan.deposit, DEFAULT_SETTINGS, rate);
    const balance = estimatePayout(plan.balance, DEFAULT_SETTINGS, rate);
    const single = estimatePayout(whole, DEFAULT_SETTINGS, rate);

    const fixed = toMinorUnits(DEFAULT_SETTINGS.fixedFees.EUR);
    expect(toMinorUnits(deposit.fee.value) + toMinorUnits(balance.fee.value)).toBe(
      toMinorUnits(single.fee.value) + fixed,
    );

    const note = splitPayoutNote(deposit, balance, single);
    expect(note?.combinedInr).toBe(deposit.netInr + balance.netInr);
    expect(note?.extraFeeInr).toBeGreaterThan(0);
    expect(note?.combinedInr).toBeLessThan(single.netInr);
  });

  it("waits until both parts are known", () => {
    expect(splitPayoutNote(null, null, null)).toBeNull();
  });
});
