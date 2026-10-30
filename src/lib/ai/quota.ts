import "server-only";
import { today } from "@/lib/clock";
import { getStore } from "@/lib/store";

const ADDRESS_LIMIT = 10;
const ADDRESS_WINDOW_SECONDS = 60 * 60;
// Google allows 500 requests a day per model; the rest is room for the checks run by hand.
const DAILY_LIMIT = 400;
const DAY_SECONDS = 24 * 60 * 60;

export class AiQuotaError extends Error {
  constructor(
    readonly scope: "address" | "daily",
    message: string,
  ) {
    super(message);
    this.name = "AiQuotaError";
  }
}

// The address is counted first, so someone over their own limit does not use up the shared allowance.
export async function reserveModelCall(address: string): Promise<void> {
  const store = getStore();

  const fromAddress = await store.hitRateLimit(`extract:${address}`, ADDRESS_WINDOW_SECONDS);
  if (fromAddress > ADDRESS_LIMIT) {
    throw new AiQuotaError(
      "address",
      `You have used all ${ADDRESS_LIMIT} extractions for this hour. Try again in about 60 minutes.`,
    );
  }

  const fromEveryone = await store.hitRateLimit(`ai-calls:${today()}`, DAY_SECONDS);
  if (fromEveryone > DAILY_LIMIT) {
    throw new AiQuotaError(
      "daily",
      "Dueline's daily AI allowance is used up. You can still fill the invoice by hand.",
    );
  }
}
