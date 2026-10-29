import { NextResponse } from "next/server";
import type { ApiError } from "@/types";

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function fail(status: number, code: string, message: string, debugId?: string): Response {
  const body: ApiError = { error: { code, message, ...(debugId ? { debugId } : {}) } };
  return Response.json(body, { status });
}
