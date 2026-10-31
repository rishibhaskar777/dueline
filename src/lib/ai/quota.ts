import "server-only";
import { today } from "@/lib/clock";
import { getStore } from "@/lib/store";

interface AddressLimit {
  key: string;
  limit: number;
  what: string;
}

const EXTRACTIONS: AddressLimit = { key: "extract", limit: 10, what: "extractions" };
const REMINDER_DRAFTS: AddressLimit = { key: "reminder-draft", limit: 20, what: "reminder drafts" };
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

async function reserveForAddress(
  address: string,
  { key, limit, what }: AddressLimit,
): Promise<void> {
  const used = await getStore().hitRateLimit(`${key}:${address}`, ADDRESS_WINDOW_SECONDS);
  if (used > limit) {
    throw new AiQuotaError(
      "address",
      `You have used all ${limit} ${what} for this hour. Try again in about 60 minutes.`,
    );
  }
}

export async function reserveDailyModelCall(): Promise<void> {
  const fromEveryone = await getStore().hitRateLimit(`ai-calls:${today()}`, DAY_SECONDS);
  if (fromEveryone > DAILY_LIMIT) {
    throw new AiQuotaError(
      "daily",
      "Dueline's daily AI allowance is used up. You can still fill the invoice by hand.",
    );
  }
}

// The address is counted first, so someone over their own limit does not use up the shared allowance.
export async function reserveModelCall(address: string): Promise<void> {
  await reserveForAddress(address, EXTRACTIONS);
  await reserveDailyModelCall();
}

export async function reserveReminderDraft(address: string): Promise<void> {
  await reserveForAddress(address, REMINDER_DRAFTS);
  await reserveDailyModelCall();
}
