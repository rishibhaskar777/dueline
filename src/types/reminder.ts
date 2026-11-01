export type Tone = "gentle" | "firm" | "final";

// How a reminder reached the client: PayPal's standard reminder, or the freelancer's own email.
export type ReminderChannel = "paypal" | "email";

export type ReminderLanguage = "en" | "de" | "fr" | "es" | "nl" | "pt" | "hi";

export interface ReminderDraft {
  invoiceId: string;
  tone: Tone;
  suggestedTone: Tone;
  reason: string;
  language: ReminderLanguage;
  subject: string;
  message: string;
  source: "ai" | "template";
  pending: boolean;
  history: { tone: Tone; sentAt: string; channel: ReminderChannel }[];
}
