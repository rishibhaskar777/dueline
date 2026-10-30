import "server-only";
import { z } from "zod";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export const SANDBOX_BUYER_DOMAIN = "@personal.example.com";

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
  SANDBOX_BUYER_EMAIL: z
    .email()
    .refine((email) => email.endsWith(SANDBOX_BUYER_DOMAIN), `must end in ${SANDBOX_BUYER_DOMAIN}`)
    .optional(),
});

type Env = Readonly<z.infer<typeof envSchema>>;

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

export function getEnv(): Env {
  if (cached) return cached;
  const result = envSchema.safeParse(withoutBlanks(process.env));
  if (!result.success) throw new ConfigError(describeProblems(result.error));
  cached = Object.freeze(result.data);
  return cached;
}

export function resetEnvCache(): void {
  cached = undefined;
}
