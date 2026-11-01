import { connection } from "next/server";
import { runDailyPreparation } from "@/lib/automation/daily-run";
import { DemoUnavailableError } from "@/lib/demo/errors";
import { getEnv } from "@/lib/env";
import type { DailyRunResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";

export async function POST(): Promise<Response> {
  await connection();
  try {
    if (!getEnv().DEMO_MODE) throw new DemoUnavailableError();
    return ok<DailyRunResponse>(await runDailyPreparation());
  } catch (error) {
    return failFromError(error);
  }
}
