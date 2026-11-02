import type { ProfileFormValues } from "./profile-form";

export const PREVIEW_NAME_PLACEHOLDER = "Your business name";

// Up to two capital letters for the disc in the header preview: from the business name, otherwise
// the person's own name.
export function initialsOf({ businessName, yourName }: ProfileFormValues): string {
  const source = businessName.trim() || yourName.trim();
  const letters = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0]);
  return letters.join("").toUpperCase();
}

// The line under the business name: who signs, the GSTIN and the website, whichever are filled in.
export function previewDetails({ yourName, gstin, website }: ProfileFormValues): string {
  return [yourName.trim() || "Your name", gstin.trim() && `GSTIN ${gstin.trim()}`, website.trim()]
    .filter(Boolean)
    .join(" · ");
}
