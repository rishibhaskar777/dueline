import "server-only";
import { hashRequestBody } from "@/lib/requests/body-hash";
import { claimRequest } from "@/lib/requests/claim-request";
import type { Json, Store } from "@/lib/store/store";

interface ClaimedWrite<T> {
  requestId: string;
  // What the request is about, apart from its ID: a repeat with another body is a conflict.
  body: unknown;
  messages: { conflict: string; inProgress: string };
  readStored: (stored: Json) => T;
  // Runs once per request. When it throws, the request ID is released so the user can try again.
  run: () => Promise<T>;
  // For bookkeeping after `run` has changed something outside Dueline. A failure here keeps the
  // request ID claimed, so a retry cannot repeat what `run` already did.
  afterRun?: (result: T) => Promise<void>;
}

// A write that happens once per request ID: a repeat gets the stored result, not a second write.
export async function runClaimed<T extends { [key: string]: Json }>(
  store: Store,
  { requestId, body, messages, readStored, run, afterRun }: ClaimedWrite<T>,
): Promise<T> {
  const claim = await claimRequest(store, requestId, hashRequestBody(body), messages, readStored);
  if (claim.kind === "replay") return claim.result;

  let result: T;
  try {
    result = await run();
  } catch (error) {
    await store.release(requestId);
    throw error;
  }
  await afterRun?.(result);
  await store.complete(requestId, result);
  return result;
}
