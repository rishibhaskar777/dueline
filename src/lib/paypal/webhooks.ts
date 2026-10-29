import "server-only";
import { getEnv } from "@/lib/env";
import { paypalFetch } from "./rest";

export const MAX_WEBHOOK_BYTES = 100 * 1024;

const SIGNATURE_HEADERS = {
  transmissionId: "paypal-transmission-id",
  transmissionTime: "paypal-transmission-time",
  certUrl: "paypal-cert-url",
  authAlgo: "paypal-auth-algo",
  transmissionSig: "paypal-transmission-sig",
} as const;

function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

// PayPal checks the signature against the exact bytes it sent, so the event goes into the
// request as the received text and is never parsed and written out again.
export async function verifyWebhook(rawBody: string, headers: Headers): Promise<boolean> {
  const { PAYPAL_WEBHOOK_ID } = getEnv();
  if (!PAYPAL_WEBHOOK_ID) {
    console.warn("Webhook not verified", { reason: "missing_webhook_id" });
    return false;
  }

  const received = Object.entries(SIGNATURE_HEADERS).map(
    ([field, name]) => [field, headers.get(name)] as const,
  );
  if (received.some(([, value]) => !value)) {
    console.warn("Webhook not verified", { reason: "missing_headers" });
    return false;
  }

  // A body that is one complete JSON value cannot add fields of its own to the request below.
  if (!isJson(rawBody)) {
    console.warn("Webhook not verified", { reason: "body_not_json" });
    return false;
  }

  const [id, time, certUrl, authAlgo, sig] = received.map(([, value]) => JSON.stringify(value));
  const body =
    `{"auth_algo":${authAlgo},"cert_url":${certUrl},"transmission_id":${id},` +
    `"transmission_sig":${sig},"transmission_time":${time},` +
    `"webhook_id":${JSON.stringify(PAYPAL_WEBHOOK_ID)},"webhook_event":${rawBody}}`;

  const result = await paypalFetch<{ verification_status?: string }>(
    "/v1/notifications/verify-webhook-signature",
    { method: "POST", rawBody: body },
  );
  if (result?.verification_status === "SUCCESS") return true;
  console.warn("Webhook not verified", { reason: "verification_failed" });
  return false;
}
