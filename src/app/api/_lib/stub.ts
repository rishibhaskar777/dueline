import { ok } from "./respond";

export const STUB_HEADER = "x-dueline-stub";

export function stubOk<T>(data: T): Response {
  return ok(data, { headers: { [STUB_HEADER]: "true" } });
}

export function stubNoContent(): Response {
  return new Response(null, { status: 204, headers: { [STUB_HEADER]: "true" } });
}

export function stubText(body: string, headers: Record<string, string>): Response {
  return new Response(body, { headers: { ...headers, [STUB_HEADER]: "true" } });
}
