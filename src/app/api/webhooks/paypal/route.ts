import { PayPalApiError } from "@/lib/paypal/errors";
import { parseWebhookEvent, processWebhookEvent } from "@/lib/paypal/webhook-events";
import { MAX_WEBHOOK_BYTES, verifyWebhook } from "@/lib/paypal/webhooks";
import { fail, noContent } from "@/app/api/_lib/respond";

function tooLarge(): Response {
  return fail(400, "invalid_webhook", "The webhook body is too large.");
}

export async function POST(req: Request): Promise<Response> {
  if (Number(req.headers.get("content-length")) > MAX_WEBHOOK_BYTES) return tooLarge();
  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody) > MAX_WEBHOOK_BYTES) return tooLarge();

  try {
    if (!(await verifyWebhook(rawBody, req.headers))) {
      return fail(400, "invalid_webhook", "The webhook could not be verified.");
    }
    const event = parseWebhookEvent(rawBody);
    if (!event) {
      console.warn("Verified webhook ignored", { reason: "unexpected_shape" });
      return noContent();
    }
    await processWebhookEvent(event);
    return noContent();
  } catch (error) {
    // PayPal retries any non-2xx answer, so a failure here is not lost.
    console.error("Webhook processing failed", {
      name: error instanceof Error ? error.name : "unknown",
      debugId: error instanceof PayPalApiError ? error.debugId : undefined,
    });
    return fail(500, "internal_error", "The webhook could not be processed. PayPal will retry.");
  }
}
