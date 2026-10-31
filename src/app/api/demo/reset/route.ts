import { connection } from "next/server";
import { resetDemo } from "@/lib/demo/reset";
import type { DemoResetResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";

export async function POST(): Promise<Response> {
  await connection();
  try {
    return ok<DemoResetResponse>(await resetDemo());
  } catch (error) {
    return failFromError(error);
  }
}
