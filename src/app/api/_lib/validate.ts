import type { z } from "zod";
import { fail } from "@/app/api/_lib/respond";

type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

function invalid<T>(error: z.ZodError): Parsed<T> {
  const issue = error.issues[0];
  const field = issue.path.join(".");
  const message = field ? `${field}: ${issue.message}` : issue.message;
  return { ok: false, response: fail(400, "invalid_request", message) };
}

export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<Parsed<z.infer<S>>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { ok: false, response: fail(400, "invalid_request", "The request body must be JSON.") };
  }
  const result = schema.safeParse(json);
  return result.success ? { ok: true, data: result.data } : invalid(result.error);
}

export function parseQuery<S extends z.ZodType>(req: Request, schema: S): Parsed<z.infer<S>> {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const result = schema.safeParse(params);
  return result.success ? { ok: true, data: result.data } : invalid(result.error);
}
