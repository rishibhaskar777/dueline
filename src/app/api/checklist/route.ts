import { connection } from "next/server";
import { getChecklist } from "@/lib/checklist/checklist";
import type { Checklist } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return ok<Checklist>(await getChecklist());
  } catch (error) {
    return failFromError(error);
  }
}
