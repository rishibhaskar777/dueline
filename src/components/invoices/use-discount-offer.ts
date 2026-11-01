"use client";

import { useCallback } from "react";
import type { ClientRisk } from "@/types";
import type { InvoiceForm } from "./invoice-form";

type Suggestion = NonNullable<ClientRisk["suggestion"]>;
type DiscountFields = Pick<InvoiceForm, "discountOn" | "discountPercent" | "discountDays">;

export function discountFieldsFor({ percent, withinDays }: Suggestion): DiscountFields {
  return { discountOn: true, discountPercent: String(percent), discountDays: String(withinDays) };
}

function sameDiscount(form: DiscountFields, suggestion: Suggestion): boolean {
  const offered = discountFieldsFor(suggestion);
  return (
    form.discountOn &&
    Number(form.discountPercent) === Number(offered.discountPercent) &&
    Number(form.discountDays) === Number(offered.discountDays)
  );
}

// Links the radar's suggestion to the one early-payment discount control: offering it switches that
// control on and fills it, and the radar reads the control back to say whether it is in place.
export function useDiscountOffer(
  form: DiscountFields,
  suggestion: Suggestion | null,
  update: (changes: Partial<InvoiceForm>) => void,
): { applied: boolean; offer: () => void } {
  const applied = suggestion !== null && sameDiscount(form, suggestion);
  const offer = useCallback(() => {
    if (suggestion) update(discountFieldsFor(suggestion));
  }, [suggestion, update]);
  return { applied, offer };
}
