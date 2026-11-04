import type { PaymentPromise } from "./promise";

// heads_up is the friendly note before the due date; the other three are for a late invoice.
export type Tone = "heads_up" | "gentle" | "firm" | "final";

// How a reminder reached the client: PayPal's standard reminder, or the freelancer's own email.
export type ReminderChannel = "paypal" | "email";

export type ReminderLanguage = "en" | "de" | "fr" | "es" | "nl" | "pt" | "hi";

export interface ReminderDraft {
  invoiceId: string;
  tone: Tone;
  suggestedTone: Tone;
  reason: string;
  language: ReminderLanguage;
  languageSuggestion: ReminderLanguage | null;
  subject: string;
  message: string;
  source: "ai" | "template";
  pending: boolean;
  promise?: PaymentPromise;
  // PayPal refused a heads-up reminder for this invoice today, so only the freelancer's own message is offered.
  paypalRefused?: true;
  history: { tone: Tone; sentAt: string; channel: ReminderChannel }[];
}
