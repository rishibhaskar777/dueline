import "server-only";
import { getEnv, SANDBOX_BUYER_DOMAIN } from "@/lib/env";

export class RecipientNotAllowedError extends Error {
  constructor() {
    super("In the demo, invoices and reminders can only go to PayPal sandbox buyers.");
    this.name = "RecipientNotAllowedError";
  }
}

export function assertSandboxBuyers(emails: string[]): void {
  if (!getEnv().DEMO_MODE) return;
  if (emails.some((email) => !email.toLowerCase().endsWith(SANDBOX_BUYER_DOMAIN))) {
    throw new RecipientNotAllowedError();
  }
}
