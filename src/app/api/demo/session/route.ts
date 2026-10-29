import { getDemoAccess } from "@/lib/demo-access/config";
import { DEMO_COOKIE_NAME, demoCookieOptions } from "@/lib/demo-access/constants";
import { passwordMatches } from "@/lib/demo-access/password";
import { createSessionToken } from "@/lib/demo-access/session";
import { getStore } from "@/lib/store";
import { demoSessionRequestSchema } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { fail, noContent } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;

// Vercel overwrites x-forwarded-for with the client's real address, so a client cannot choose it.
function addressOf(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, demoSessionRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const access = getDemoAccess();
    if (access.kind === "misconfigured") return fail(500, "config_error", access.message);
    if (access.kind === "open") {
      return fail(500, "config_error", "Demo access is off. Set DEMO_PASSWORD to turn it on.");
    }

    const attempts = await getStore().hitRateLimit(
      `demo-session:${addressOf(req)}`,
      ATTEMPT_WINDOW_SECONDS,
    );
    if (attempts > MAX_ATTEMPTS) {
      return fail(429, "rate_limited", "Too many attempts. Try again in 15 minutes.");
    }
    if (!(await passwordMatches(parsed.data.password, access.password))) {
      return fail(401, "unauthorized", "That password is not right.");
    }

    const response = noContent();
    response.cookies.set(
      DEMO_COOKIE_NAME,
      await createSessionToken(access.secret, new Date()),
      demoCookieOptions(),
    );
    return response;
  } catch (error) {
    return failFromError(error);
  }
}

export async function DELETE(): Promise<Response> {
  const response = noContent();
  response.cookies.set(DEMO_COOKIE_NAME, "", { ...demoCookieOptions(), maxAge: 0 });
  return response;
}
