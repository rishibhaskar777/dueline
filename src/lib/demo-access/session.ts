import { DEMO_SESSION_SECONDS } from "./constants";

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  try {
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function importKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export async function createSessionToken(secret: string, now: Date): Promise<string> {
  const expiresAt = String(Math.floor(now.getTime() / 1000) + DEMO_SESSION_SECONDS);
  const key = await importKey(secret, "sign");
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(expiresAt));
  return `${expiresAt}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
  now: Date,
): Promise<boolean> {
  const [expiresAt, encoded, ...rest] = token.split(".");
  if (!encoded || rest.length > 0 || !/^\d{1,12}$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Math.floor(now.getTime() / 1000)) return false;

  const signature = fromBase64Url(encoded);
  if (!signature) return false;
  const key = await importKey(secret, "verify");
  // subtle.verify compares the signature in constant time.
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(expiresAt));
}
