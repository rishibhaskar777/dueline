import type { ClientRisk } from "@/types";

// With only a few invoices behind it, a rating can be one late payment away from changing.
const FEW_INVOICES = 4;

export function basisNote({
  invoicesConsidered,
}: Pick<ClientRisk, "invoicesConsidered">): string | null {
  if (invoicesConsidered === 0 || invoicesConsidered >= FEW_INVOICES) return null;
  return `Based on ${invoicesConsidered} ${invoicesConsidered === 1 ? "invoice" : "invoices"}.`;
}
