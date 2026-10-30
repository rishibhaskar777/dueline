import "server-only";
import { createHash } from "node:crypto";

// Keys are sorted, so the same request hashes the same whatever order its fields arrived in.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, field]) => field !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, field]) => [key, canonical(field)]),
    );
  }
  return value;
}

export function hashRequestBody(body: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical(body)))
    .digest("hex");
}
