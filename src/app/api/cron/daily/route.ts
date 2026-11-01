import { connection } from "next/server";
import { isCronAuthorised } from "@/lib/automation/cron-auth";
import { runDailyPreparation } from "@/lib/automation/daily-run";
import { getEnv } from "@/lib/env";
import type { DailyRunResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { fail, ok } from "@/app/api/_lib/respond";

// Called by the cron service with the shared secret, not with the demo cookie.
export async function GET(req: Request): Promise<Response> {
  await connection();
  try {
    if (!isCronAuthorised(req.headers.get("authorization"), getEnv().CRON_SECRET)) {
      return fail(401, "unauthorized", "This job can only be started by the cron service.");
    }
    return ok<DailyRunResponse>(await runDailyPreparation());
  } catch (error) {
    return failFromError(error);
  }
}
