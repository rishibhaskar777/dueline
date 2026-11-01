import type { FormItem } from "@/components/invoices/invoice-form";
import { saveLibraryItemRequestSchema, type CurrencyCode, type LibraryItem } from "@/types";

type Converted = { ok: true; item: Omit<LibraryItem, "id"> } | { ok: false; message: string };

// What the invoice form holds for one row, checked the way the server checks a library item.
export function libraryInputFrom(item: FormItem, currency: CurrencyCode): Converted {
  const parsed = saveLibraryItemRequestSchema.safeParse({
    name: item.name,
    unitAmount: item.unitAmount.trim(),
    currency,
    sac: item.sac.trim() || null,
  });
  if (parsed.success) {
    const { name, unitAmount, sac } = parsed.data;
    return { ok: true, item: { name, unitAmount, currency, sac } };
  }
  const field = String(parsed.error.issues[0].path[0]);
  const messages: Record<string, string> = {
    name: "Enter the item name first.",
    unitAmount: "Enter a unit price first, like 120 or 45.50.",
    sac: "Use 6 digits starting with 99 for the SAC, or leave it empty.",
  };
  return { ok: false, message: messages[field] ?? "This item cannot be saved." };
}

// The first item of a new invoice is usually an empty row, which a library item should replace.
export function isBlankItem(item: FormItem): boolean {
  return item.name.trim() === "" && item.unitAmount.trim() === "";
}
