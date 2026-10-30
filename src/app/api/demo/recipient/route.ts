import { connection } from "next/server";
import { getEnv } from "@/lib/env";
import type { DemoRecipientResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { fail, ok } from "@/app/api/_lib/respond";

export async function GET(): Promise<Response> {
  // Without this the build would answer from the environment it was built with.
  await connection();
  try {
    const { DEMO_MODE, SANDBOX_BUYER_EMAIL } = getEnv();
    if (!DEMO_MODE || !SANDBOX_BUYER_EMAIL) {
      return fail(404, "not_found", "No demo buyer is set up.");
    }
    return ok<DemoRecipientResponse>({ email: SANDBOX_BUYER_EMAIL });
  } catch (error) {
    return failFromError(error);
  }
}
