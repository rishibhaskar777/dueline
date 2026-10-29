const DEFAULT_NEXT_PATH = "/receivables";

const SAME_SITE_PATH = /^\/(?![/\\])/;
const FORBIDDEN_CHARACTER = /[\\\u0000-\u001f]/;

// Only a path on this site is allowed, so a sign-in link cannot send people elsewhere.
// A backslash is refused because browsers read "/\host" as "//host".
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !SAME_SITE_PATH.test(value) || FORBIDDEN_CHARACTER.test(value)) {
    return DEFAULT_NEXT_PATH;
  }
  return value;
}
