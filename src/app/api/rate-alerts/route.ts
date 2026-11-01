import { connection } from "next/server";
import { triggeredRateAlerts } from "@/lib/automation/rate-alert-status";
import type { RateAlertsResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return ok<RateAlertsResponse>({ alerts: await triggeredRateAlerts() });
  } catch (error) {
    return failFromError(error);
  }
}
