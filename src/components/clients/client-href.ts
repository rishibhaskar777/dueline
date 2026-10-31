// "by-key" keeps a client called "risk" or "new" from landing on a fixed route.
export function clientHref(key: string): string {
  return `/clients/by-key/${encodeURIComponent(key)}`;
}
