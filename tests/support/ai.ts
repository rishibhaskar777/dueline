import { APICallError, NoObjectGeneratedError } from "ai";
import type { ModelDraft } from "@/lib/ai/check-draft";

export function apiCallError(statusCode?: number): APICallError {
  return new APICallError({
    message: "provider failure",
    url: "https://provider.test/v1",
    requestBodyValues: {},
    statusCode,
  });
}

export function noObjectError(): NoObjectGeneratedError {
  return new NoObjectGeneratedError({
    message: "no object",
    response: {} as ConstructorParameters<typeof NoObjectGeneratedError>[0]["response"],
    usage: {} as ConstructorParameters<typeof NoObjectGeneratedError>[0]["usage"],
    finishReason: "other",
  });
}

export const haldenGuess: ModelDraft = {
  clientName: "Halden Coffee Co.",
  clientEmail: "[EMAIL_1]",
  currency: "USD",
  dueOn: null,
  items: [
    {
      name: "Logo option",
      quantity: 3,
      unitAmount: "120",
      sourceQuote: "Logos for $120 each",
    },
    {
      name: "Revision round",
      quantity: 2,
      unitAmount: "45.00",
      sourceQuote: "revisions $45 a round",
    },
  ],
  note: null,
  purposeCode: "P1099",
  purposeReason: "Logo design has no closer match, so it is other services.",
};

// The Halden chat gives only a delivery date, so the model rightly returns no payment due date.
// Tests that look at other warnings use this answer, which states payment terms.
export const haldenGuessWithTerms: ModelDraft = { ...haldenGuess, dueOn: "2026-11-30" };
