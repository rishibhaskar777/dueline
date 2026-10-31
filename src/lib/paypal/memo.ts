import { isPurposeCode } from "@/lib/export/purpose-codes";

const PURPOSE_TAG = "purpose:";

// The memo is visible only to the invoicer, so it carries what the client must not see: a marker
// that finds the invoice again, and the RBI purpose code.
export function memoOf(marker: string, purposeCode: string | null): string {
  return purposeCode ? `${marker} ${PURPOSE_TAG}${purposeCode}` : marker;
}

export function markerOf(memo: string | undefined): string {
  return memo?.split(" ")[0] ?? "";
}

export function purposeCodeOf(memo: string | undefined): string | null {
  const tagged = memo?.split(" ").find((part) => part.startsWith(PURPOSE_TAG));
  const code = tagged?.slice(PURPOSE_TAG.length) ?? "";
  return isPurposeCode(code) ? code : null;
}
