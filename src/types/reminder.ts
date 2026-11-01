export type Tone = "gentle" | "firm" | "final";

export type ReminderLanguage = "en" | "de" | "fr" | "es" | "nl" | "pt" | "hi";

export interface ReminderDraft {
  invoiceId: string;
  tone: Tone;
  suggestedTone: Tone;
  language: ReminderLanguage;
  subject: string;
  message: string;
  source: "ai" | "template";
  pending: boolean;
  history: { tone: Tone; sentAt: string }[];
}
