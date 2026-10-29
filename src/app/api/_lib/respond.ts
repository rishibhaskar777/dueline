import type { ApiError } from "@/types";

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function fail(status: number, code: string, message: string, debugId?: string): Response {
  const body: ApiError = { error: { code, message, ...(debugId ? { debugId } : {}) } };
  return Response.json(body, { status });
}
