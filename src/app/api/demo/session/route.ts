import {
  ADDRESS_ATTEMPTS,
  ATTEMPT_WINDOW_SECONDS,
  attemptKeys,
  BROWSER_ATTEMPTS,
  browserIdOf,
  type BrowserId,
} from "@/lib/demo-access/attempt-keys";
import { getDemoAccess } from "@/lib/demo-access/config";
import {
  BROWSER_COOKIE_NAME,
  DEMO_COOKIE_NAME,
  demoCookieOptions,
} from "@/lib/demo-access/constants";
import { passwordMatches } from "@/lib/demo-access/password";
import { createSessionToken } from "@/lib/demo-access/session";
import { afterResponse } from "@/lib/after-response";
import { warmInvoiceSnapshot } from "@/lib/paypal/summaries";
import { getStore } from "@/lib/store";
import { retryOnce } from "@/lib/store/retry-once";
import { demoSessionRequestSchema } from "@/types";
import { addressOf } from "@/app/api/_lib/address";
import { failFromError } from "@/app/api/_lib/errors";
import { fail, noContent } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

const BROWSER_COOKIE_SECONDS = 30 * 24 * 60 * 60;

// The first attempt of a browser has no id yet, so every answer to it carries one.
function withBrowserId(response: Response, { id, isNew }: BrowserId): Response {
  if (!isNew) return response;
  const { secure } = demoCookieOptions();
  response.headers.append(
    "set-cookie",
    `${BROWSER_COOKIE_NAME}=${id}; Path=/; Max-Age=${BROWSER_COOKIE_SECONDS}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
  );
  return response;
}

async function tooManyAttempts(req: Request, browser: BrowserId): Promise<boolean> {
  const keys = attemptKeys(addressOf(req), browser.id);
  const store = getStore();
  const [fromBrowser, fromAddress] = await retryOnce(() =>
    Promise.all([
      store.hitRateLimit(keys.browser, ATTEMPT_WINDOW_SECONDS),
      store.hitRateLimit(keys.address, ATTEMPT_WINDOW_SECONDS),
    ]),
  );
  return fromBrowser > BROWSER_ATTEMPTS || fromAddress > ADDRESS_ATTEMPTS;
}

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, demoSessionRequestSchema);
  if (!parsed.ok) return parsed.response;
  const browser = browserIdOf(req.headers.get("cookie"));

  try {
    const access = getDemoAccess();
    if (access.kind === "misconfigured") return fail(500, "config_error", access.message);
    if (access.kind === "open") {
      return fail(500, "config_error", "Demo access is off. Set DEMO_PASSWORD to turn it on.");
    }

    if (await tooManyAttempts(req, browser)) {
      return withBrowserId(
        fail(429, "rate_limited", "Too many attempts. Try again in 15 minutes."),
        browser,
      );
    }
    if (!(await passwordMatches(parsed.data.password, access.password))) {
      return withBrowserId(fail(401, "unauthorized", "That password is not right."), browser);
    }

    const response = noContent();
    response.cookies.set(
      DEMO_COOKIE_NAME,
      await createSessionToken(access.secret, new Date()),
      demoCookieOptions(),
    );
    afterResponse(warmInvoiceSnapshot);
    return withBrowserId(response, browser);
  } catch (error) {
    return withBrowserId(failFromError(error), browser);
  }
}

export async function DELETE(): Promise<Response> {
  const response = noContent();
  response.cookies.set(DEMO_COOKIE_NAME, "", { ...demoCookieOptions(), maxAge: 0 });
  return response;
}
