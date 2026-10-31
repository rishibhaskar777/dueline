import { connection } from "next/server";
import { buildDashboard } from "@/lib/insights/dashboard";
import type { DashboardResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return ok<DashboardResponse>(await buildDashboard());
  } catch (error) {
    return failFromError(error);
  }
}
