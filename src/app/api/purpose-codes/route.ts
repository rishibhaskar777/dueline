import { PURPOSE_CODES } from "@/lib/export/purpose-codes";
import type { PurposeCodesResponse } from "@/types";
import { ok } from "@/app/api/_lib/respond";

export async function GET(): Promise<Response> {
  return ok<PurposeCodesResponse>({ codes: [...PURPOSE_CODES] });
}
