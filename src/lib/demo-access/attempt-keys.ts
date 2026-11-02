import { BROWSER_COOKIE_NAME } from "./constants";

export const BROWSER_ATTEMPTS = 10;
// A company office shares one address, so the address limit is well above one person's.
export const ADDRESS_ATTEMPTS = 60;
export const ATTEMPT_WINDOW_SECONDS = 15 * 60;

const BROWSER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface BrowserId {
  id: string;
  // True when the request carried none, so the answer must set it.
  isNew: boolean;
}

// The browser is told apart by a random id in its own cookie. Someone who drops the cookie gets a
// fresh browser count but is still held by the address count.
export function browserIdOf(cookieHeader: string | null): BrowserId {
  const found = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${BROWSER_COOKIE_NAME}=`))
    ?.slice(BROWSER_COOKIE_NAME.length + 1);
  return found && BROWSER_ID.test(found)
    ? { id: found, isNew: false }
    : { id: crypto.randomUUID(), isNew: true };
}

export function attemptKeys(
  address: string,
  browserId: string,
): { browser: string; address: string } {
  return {
    browser: `demo-session:browser:${browserId}`,
    address: `demo-session:address:${address}`,
  };
}
