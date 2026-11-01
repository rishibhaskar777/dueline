import "server-only";
import { z } from "zod";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export const SANDBOX_BUYER_DOMAIN = "@personal.example.com";

// Offline mode needs no accounts, so the settings it would otherwise ask for have fixed values.
export const OFFLINE_DEMO_PASSWORD = "offline";
export const OFFLINE_BUYER_EMAIL = `buyer${SANDBOX_BUYER_DOMAIN}`;
const OFFLINE_WEBHOOK_ID = "offline-webhook";
const OFFLINE_SESSION_SECRET = "dueline-offline-demo-session-secret";

const envSchema = z.object({
  PAYPAL_CLIENT_ID: z.string().min(1),
  PAYPAL_CLIENT_SECRET: z.string().min(1),
  PAYPAL_ENVIRONMENT: z.literal("sandbox"),
  PAYPAL_WEBHOOK_ID: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).optional(),
  GEMINI_FALLBACK_MODEL: z.string().min(1).optional(),
  DATABASE_URL: z.url().optional(),
  DEMO_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  DEMO_TODAY: z.iso.date().optional(),
  DEMO_PASSWORD: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  SANDBOX_BUYER_EMAIL: z
    .email()
    .refine((email) => email.endsWith(SANDBOX_BUYER_DOMAIN), `must end in ${SANDBOX_BUYER_DOMAIN}`)
    .optional(),
});

const offlineSchema = envSchema.partial({
  PAYPAL_CLIENT_ID: true,
  PAYPAL_CLIENT_SECRET: true,
  PAYPAL_ENVIRONMENT: true,
});

const offlineFlagSchema = z.enum(["true", "false"]).default("false");

type Env = Readonly<z.infer<typeof envSchema> & { DUELINE_OFFLINE: boolean }>;

interface Deployment {
  NODE_ENV?: string;
  CI?: string;
  VERCEL?: string;
}

let cached: Env | undefined;

function withoutBlanks(source: NodeJS.ProcessEnv): Record<string, string> {
  const entries = Object.entries(source).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== "",
  );
  return Object.fromEntries(entries);
}

function describeProblems(error: z.ZodError): string {
  const names = [...new Set(error.issues.map((issue) => String(issue.path[0])))];
  const others = names.filter((name) => name !== "PAYPAL_ENVIRONMENT");
  const parts: string[] = [];
  if (names.includes("PAYPAL_ENVIRONMENT"))
    parts.push("Dueline only runs against the PayPal sandbox.");
  if (others.length > 0) parts.push(`Missing or invalid settings: ${others.join(", ")}.`);
  return parts.join(" ");
}

// Offline mode is for a developer's computer and for CI. A deployed copy would hand every visitor
// a demo with a published password, so it is refused on Vercel and in any other production run.
export function offlineRefusal({ NODE_ENV, CI, VERCEL }: Deployment): string | null {
  if (VERCEL) return "Offline mode cannot run on Vercel. Remove DUELINE_OFFLINE.";
  if (NODE_ENV === "production" && CI !== "true") {
    return "Offline mode runs only in development and in CI. Remove DUELINE_OFFLINE.";
  }
  return null;
}

function parseOffline(source: Record<string, string>): Env {
  const refusal = offlineRefusal({
    NODE_ENV: source.NODE_ENV,
    CI: source.CI,
    VERCEL: source.VERCEL,
  });
  if (refusal) throw new ConfigError(refusal);

  const result = offlineSchema.safeParse(source);
  if (!result.success) throw new ConfigError(describeProblems(result.error));
  const { DEMO_TODAY, DEMO_PASSWORD, SESSION_SECRET, CRON_SECRET, SANDBOX_BUYER_EMAIL } =
    result.data;

  // Accounts, keys and the database named in the environment are ignored on purpose.
  return {
    PAYPAL_CLIENT_ID: "offline",
    PAYPAL_CLIENT_SECRET: "offline",
    PAYPAL_ENVIRONMENT: "sandbox",
    PAYPAL_WEBHOOK_ID: OFFLINE_WEBHOOK_ID,
    DEMO_MODE: true,
    DEMO_TODAY,
    DEMO_PASSWORD: DEMO_PASSWORD ?? OFFLINE_DEMO_PASSWORD,
    SESSION_SECRET: SESSION_SECRET ?? OFFLINE_SESSION_SECRET,
    CRON_SECRET,
    SANDBOX_BUYER_EMAIL: SANDBOX_BUYER_EMAIL ?? OFFLINE_BUYER_EMAIL,
    DUELINE_OFFLINE: true,
  };
}

function parseOnline(source: Record<string, string>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) throw new ConfigError(describeProblems(result.error));
  return { ...result.data, DUELINE_OFFLINE: false };
}

export function getEnv(): Env {
  if (cached) return cached;
  const source = withoutBlanks(process.env);
  const offline = offlineFlagSchema.safeParse(source.DUELINE_OFFLINE);
  if (!offline.success) throw new ConfigError("Missing or invalid settings: DUELINE_OFFLINE.");
  cached = Object.freeze(
    offline.data === "true" ? parseOffline(source) : parseOnline(source),
  ) as Env;
  return cached;
}

export function isOffline(): boolean {
  return getEnv().DUELINE_OFFLINE;
}

export function resetEnvCache(): void {
  cached = undefined;
}
