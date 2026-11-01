import { connection } from "next/server";
import { createRepeat, listRepeats } from "@/lib/automation/repeats";
import {
  createRepeatRequestSchema,
  repeatsQuerySchema,
  type RepeatSchedule,
  type RepeatsResponse,
} from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody, parseQuery } from "@/app/api/_lib/validate";

export async function GET(req: Request): Promise<Response> {
  await connection();
  const query = parseQuery(req, repeatsQuerySchema);
  if (!query.ok) return query.response;

  try {
    return ok<RepeatsResponse>({ repeats: await listRepeats(query.data.client) });
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, createRepeatRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { invoiceId, dayOfMonth, requestId } = parsed.data;
    return ok<RepeatSchedule>(await createRepeat(invoiceId, dayOfMonth, requestId));
  } catch (error) {
    return failFromError(error);
  }
}
