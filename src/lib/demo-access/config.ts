import { getEnv } from "@/lib/env";

export type DemoAccess =
  | { kind: "open" }
  | { kind: "required"; password: string; secret: string }
  | { kind: "misconfigured"; message: string };

interface DemoAccessInput {
  password: string | undefined;
  secret: string | undefined;
  production: boolean;
}

export function resolveDemoAccess({ password, secret, production }: DemoAccessInput): DemoAccess {
  if (!password && !production) return { kind: "open" };
  if (password && secret) return { kind: "required", password, secret };

  const missing = [...(password ? [] : ["DEMO_PASSWORD"]), ...(secret ? [] : ["SESSION_SECRET"])];
  return { kind: "misconfigured", message: `Missing or invalid settings: ${missing.join(", ")}.` };
}

export function getDemoAccess(): DemoAccess {
  const { DEMO_PASSWORD, SESSION_SECRET } = getEnv();
  return resolveDemoAccess({
    password: DEMO_PASSWORD,
    secret: SESSION_SECRET,
    production: process.env.NODE_ENV === "production",
  });
}
