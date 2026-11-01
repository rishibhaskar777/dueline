import { NextResponse, type NextRequest } from "next/server";
import { fail } from "@/app/api/_lib/respond";
import { getDemoAccess, type DemoAccess } from "@/lib/demo-access/config";
import { DEMO_COOKIE_NAME } from "@/lib/demo-access/constants";
import { verifySessionToken } from "@/lib/demo-access/session";
import { ConfigError } from "@/lib/env";

export const config = {
  matcher: [
    "/api/:path*",
    "/receivables",
    "/invoices/:path*",
    "/clients/:path*",
    "/nudges",
    "/export",
    "/profile",
    "/settings",
    "/demo-tools",
  ],
};

function isPublic(method: string, pathname: string): boolean {
  return (
    pathname === "/api/demo/session" ||
    (method === "GET" && pathname === "/api/health") ||
    // Vercel cannot follow a redirect or send the demo cookie; the job checks its own secret.
    (method === "GET" && pathname === "/api/cron/daily") ||
    (method === "POST" && pathname === "/api/webhooks/paypal")
  );
}

function resolveAccess(): DemoAccess {
  try {
    return getDemoAccess();
  } catch (error) {
    if (error instanceof ConfigError) return { kind: "misconfigured", message: error.message };
    throw error;
  }
}

export async function proxy(request: NextRequest): Promise<Response> {
  const { pathname, search } = request.nextUrl;
  if (isPublic(request.method, pathname)) return NextResponse.next();

  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  const access = resolveAccess();
  if (access.kind === "open") return NextResponse.next();

  if (access.kind === "misconfigured") {
    if (isApi) return fail(500, "config_error", access.message);
    const notConfigured = request.nextUrl.clone();
    notConfigured.pathname = "/not-configured";
    notConfigured.search = "";
    return NextResponse.rewrite(notConfigured);
  }

  const token = request.cookies.get(DEMO_COOKIE_NAME)?.value;
  if (token && (await verifySessionToken(token, access.secret, new Date()))) {
    return NextResponse.next();
  }

  if (isApi) return fail(401, "unauthorized", "Enter the demo password to continue.");
  const signIn = request.nextUrl.clone();
  signIn.pathname = "/demo";
  signIn.search = "";
  signIn.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(signIn);
}
