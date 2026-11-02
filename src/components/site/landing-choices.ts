export type ChoiceCard = "payout" | "radar" | "register";

export interface LandingChoice {
  id: string;
  title: string;
  sentence: string;
  card: ChoiceCard;
}

// The three headings of the black section, the sentence under them and the card beside them.
export const LANDING_CHOICES: readonly LandingChoice[] = [
  {
    id: "rupees",
    title: "Know your rupees",
    sentence:
      "Before you send, see what reaches your bank after PayPal's fee and conversion. After the payment, see PayPal's own figures.",
    card: "payout",
  },
  {
    id: "late-payers",
    title: "Spot late payers",
    sentence:
      "Every client is scored from their payment history, so a late payer gets a firmer reminder and an early-payment discount you can offer.",
    card: "radar",
  },
  {
    id: "export-ready",
    title: "Stay export-ready",
    sentence:
      "A purpose code on every invoice, your LUT and SAC printed on it, and a monthly register that matches PayPal's FIRA and your bank's FIRC.",
    card: "register",
  },
];
