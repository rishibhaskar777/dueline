// Vercel overwrites x-forwarded-for with the client's real address, so a client cannot choose it.
export function addressOf(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
