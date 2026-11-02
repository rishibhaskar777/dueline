export type NoticeTone = "green" | "amber";

export interface NoticePill {
  text: string;
  tone: NoticeTone;
}

// What the review step tells the user before the form: what the privacy filter hid (green), then
// every note and warning from reading the chat (amber).
export function noticePills(notice: string | null, warnings: string[]): NoticePill[] {
  return [
    ...(notice ? [{ text: notice, tone: "green" as const }] : []),
    ...warnings.map((text) => ({ text, tone: "amber" as const })),
  ];
}

export const NOTICE_CLASSES: Record<NoticeTone, string> = {
  green: "bg-tint-green text-paid",
  amber: "bg-tint-amber text-due-soon",
};
