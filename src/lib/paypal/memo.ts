import { isPurposeCode } from "@/lib/export/purpose-codes";
import { sacSchema } from "@/types";

const PURPOSE_TAG = "purpose:";
const SAC_TAG = "sac:";
const SPLIT_TAG = "split:";

export type SplitRole = "deposit" | "balance";

// Ties a deposit invoice to its balance invoice: both memos carry the same id.
export interface SplitTag {
  role: SplitRole;
  id: string;
}

// The memo is visible only to the invoicer, so it carries what the client must not see: a marker
// that finds the invoice again, the RBI purpose code, the SAC of the first item and, for a deposit
// or balance invoice, the id of its pair.
export function memoOf(
  marker: string,
  purposeCode: string | null,
  sac: string | null = null,
  split: SplitTag | null = null,
): string {
  return [
    marker,
    purposeCode && `${PURPOSE_TAG}${purposeCode}`,
    sac && `${SAC_TAG}${sac}`,
    split && `${SPLIT_TAG}${split.role}.${split.id}`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function markerOf(memo: string | undefined): string {
  return memo?.split(" ")[0] ?? "";
}

function tagged(memo: string | undefined, tag: string): string {
  const part = memo?.split(" ").find((word) => word.startsWith(tag));
  return part?.slice(tag.length) ?? "";
}

export function purposeCodeOf(memo: string | undefined): string | null {
  const code = tagged(memo, PURPOSE_TAG);
  return isPurposeCode(code) ? code : null;
}

export function sacOf(memo: string | undefined): string | null {
  const code = tagged(memo, SAC_TAG);
  return sacSchema.safeParse(code).success ? code : null;
}

export function splitOf(memo: string | undefined): SplitTag | null {
  const [role, ...rest] = tagged(memo, SPLIT_TAG).split(".");
  const id = rest.join(".");
  return (role === "deposit" || role === "balance") && id ? { role, id } : null;
}
