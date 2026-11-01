export type ChecklistItemId =
  "profile" | "lut" | "first_invoice" | "morning_reminders" | "first_export";

export interface ChecklistItem {
  id: ChecklistItemId;
  label: string;
  done: boolean;
  href: string; // where it is done
}

export interface Checklist {
  items: ChecklistItem[];
  dismissed: boolean;
}
