import { connection } from "next/server";
import { getStore } from "@/lib/store";
import type { ActivityResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";

const LATEST_EVENTS = 20;

export async function GET(): Promise<Response> {
  await connection();
  try {
    return ok<ActivityResponse>({ events: await getStore().latestActivity(LATEST_EVENTS) });
  } catch (error) {
    return failFromError(error);
  }
}
