export const DEMO_COOKIE_NAME = "dueline_demo";
export const DEMO_SESSION_SECONDS = 7 * 24 * 60 * 60;

interface DemoCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
  secure: boolean;
}

export function demoCookieOptions(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): DemoCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: DEMO_SESSION_SECONDS,
    secure: nodeEnv === "production",
  };
}
