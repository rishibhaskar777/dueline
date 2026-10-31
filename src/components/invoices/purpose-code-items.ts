import type { PurposeCode } from "@/types";

export const NO_CODE = "none";

interface PurposeCodeItem {
  value: string;
  label: string;
}

export function purposeCodeItems(codes: PurposeCode[]): PurposeCodeItem[] {
  return [
    { value: NO_CODE, label: "No purpose code" },
    ...codes.map((entry) => ({ value: entry.code, label: `${entry.code} ${entry.label}` })),
  ];
}
