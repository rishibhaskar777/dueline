import { connection } from "next/server";
import { listQueue } from "@/lib/automation/queue";
import type { QueueResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return ok<QueueResponse>({ items: await listQueue() });
  } catch (error) {
    return failFromError(error);
  }
}
