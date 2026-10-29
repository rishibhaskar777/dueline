export type Tone = "gentle" | "firm" | "final";

export interface ReminderDraft {
  invoiceId: string;
  tone: Tone;
  suggestedTone: Tone;
  subject: string;
  message: string;
  history: { tone: Tone; sentAt: string }[];
}
