import type { ChecklistItem } from "@/types";

export function nextStep(items: ChecklistItem[]): ChecklistItem | null {
  return items.find((item) => !item.done) ?? null;
}

// "Download your first export register" reads on after "Next:" as "download your first ...".
export function nextStepText(item: ChecklistItem): string {
  return `Next: ${item.label.charAt(0).toLowerCase()}${item.label.slice(1)} →`;
}
