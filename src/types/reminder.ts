export type Tone = "gentle" | "firm" | "final";

export interface ReminderDraft {
  invoiceId: string;
  tone: Tone;
  suggestedTone: Tone;
  subject: string;
  message: string;
  source: "ai" | "template";
  history: { tone: Tone; sentAt: string }[];
}
