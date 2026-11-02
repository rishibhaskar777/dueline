export type NewInvoiceState = "paste" | "review" | "sent";

export interface StepHeaderModel {
  // 1 or 2: which step the pill shows as current.
  current: 1 | 2;
  heading: string;
  intro: string | null;
}

export const STEP_LABELS = ["1 · Paste the chat", "2 · Review and send"] as const;

// The heading above the form changes with the step. Once the invoice is sent the result is the
// whole page and carries its own heading.
export function stepHeader(state: NewInvoiceState): StepHeaderModel | null {
  switch (state) {
    case "paste":
      return {
        current: 1,
        heading: "Paste what your client wrote.",
        intro:
          "Dueline drafts the invoice and shows where every line came from. Nothing is sent until you click Create and send.",
      };
    case "review":
      return { current: 2, heading: "Check the draft", intro: null };
    case "sent":
      return null;
  }
}
