import type { TimelineKind } from "@/types";

export type DotTone = "blue" | "red" | "amber" | "foreground" | "muted" | "green";

const TONES: Record<TimelineKind, DotTone> = {
  created: "muted",
  sent: "foreground",
  viewed: "blue",
  reminder: "blue",
  promised: "blue",
  due: "amber",
  overdue: "red",
  paid: "green",
  cancelled: "muted",
};

export function timelineDot(kind: TimelineKind): DotTone {
  return TONES[kind];
}

export const DOT_CLASSES: Record<DotTone, string> = {
  blue: "bg-blue",
  red: "bg-mark-red",
  amber: "bg-mark-amber",
  foreground: "bg-foreground",
  muted: "bg-subtle",
  green: "bg-mark-green",
};
