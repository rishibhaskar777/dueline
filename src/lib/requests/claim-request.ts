import "server-only";
import type { Json, Store } from "@/lib/store/store";
import { DuplicateRequestError } from "./errors";

type Claimed<T> = { kind: "replay"; result: T } | { kind: "owned"; recovered: boolean };

interface ClaimMessages {
  conflict: string;
  inProgress: string;
}

// A request that has been in progress this long was most likely cut off, so it may be resolved.
const STALE_CLAIM_MS = 2 * 60 * 1000;

// A repeat of a request that is still running is refused. Once the request is old enough to have
// been cut off, one caller takes it over: release only succeeds for one of them, and for it alone.
export async function claimRequest<T>(
  store: Store,
  requestId: string,
  bodyHash: string,
  messages: ClaimMessages,
  readStored: (stored: Json) => T,
): Promise<Claimed<T>> {
  const claim = await store.claim(requestId, bodyHash);
  if (claim.kind === "new") return { kind: "owned", recovered: false };
  if (claim.kind === "replay") return { kind: "replay", result: readStored(claim.result) };
  if (claim.kind === "conflict") throw new DuplicateRequestError(messages.conflict);

  if (!(await store.release(requestId, STALE_CLAIM_MS))) {
    throw new DuplicateRequestError(messages.inProgress);
  }
  const again = await store.claim(requestId, bodyHash);
  if (again.kind !== "new") throw new DuplicateRequestError(messages.inProgress);
  return { kind: "owned", recovered: true };
}
