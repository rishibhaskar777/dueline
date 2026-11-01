import { connection } from "next/server";
import { getDailyDigest } from "@/lib/automation/daily-digest";
import type { DailyDigest } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return ok<DailyDigest>(await getDailyDigest());
  } catch (error) {
    return failFromError(error);
  }
}
