import type { ClientRisk } from "@/types";

// With only a few invoices behind it, a rating can be one late payment away from changing.
const FEW_INVOICES = 4;

function basedOn(invoicesConsidered: number): string {
  return `Based on ${invoicesConsidered} ${invoicesConsidered === 1 ? "invoice" : "invoices"}.`;
}

export function basisNote({
  invoicesConsidered,
}: Pick<ClientRisk, "invoicesConsidered">): string | null {
  if (invoicesConsidered === 0 || invoicesConsidered >= FEW_INVOICES) return null;
  return basedOn(invoicesConsidered);
}

// A merged client always says what the reading rests on, since the invoices come from more than one
// name.
export function reasonWithBasis(
  reason: string,
  invoicesConsidered: number,
  merged = false,
): string {
  const basis =
    merged && invoicesConsidered > 0
      ? basedOn(invoicesConsidered)
      : basisNote({ invoicesConsidered });
  return basis ? `${reason} ${basis}` : reason;
}
