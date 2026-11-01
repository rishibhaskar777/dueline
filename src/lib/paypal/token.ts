import "server-only";
import { getEnv, isOffline } from "@/lib/env";
import { fetchPayPal } from "./http";

// Offline mode has no PayPal to ask; the fake takes any token.
const OFFLINE_TOKEN = "offline-token";
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

let cached: { value: string; expiresAt: number } | undefined;
let inFlight: Promise<string> | undefined;

async function requestToken(): Promise<string> {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = getEnv();
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetchPayPal("/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const token = (await response.json()) as TokenResponse;
  cached = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
  return token.access_token;
}

export async function getAccessToken(): Promise<string> {
  if (isOffline()) return OFFLINE_TOKEN;
  if (cached && Date.now() < cached.expiresAt - REFRESH_MARGIN_MS) return cached.value;
  inFlight ??= requestToken().finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

export function clearAccessToken(): void {
  cached = undefined;
}
