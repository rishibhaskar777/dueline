import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// Vercel sends "Authorization: Bearer <CRON_SECRET>". Both sides are hashed first so the comparison
// takes the same time whatever the lengths are. With no secret configured nothing is accepted.
export function isCronAuthorised(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(header.slice("Bearer ".length)), digest(secret));
}
