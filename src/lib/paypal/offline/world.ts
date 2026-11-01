import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { today } from "@/lib/clock";
import { getEnv } from "@/lib/env";
import { createFakePayPal, type FakePayPal } from "./fake-paypal";
import { addPaidInvoices } from "./paid-story";

const world = createFakePayPal();

// The seed makes its own PayPal calls, which must not wait for the seed to finish.
const seeding = new AsyncLocalStorage<true>();
let ready: Promise<void> | undefined;

async function seed(): Promise<void> {
  // Loaded here because the demo seed calls back into the PayPal client that calls this module.
  const { ensureDemoProfile, seedDemo } = await import("@/lib/demo/seed");
  await ensureDemoProfile(today());
  const rows = await seedDemo();
  if (rows.some((row) => row.result === "failed")) {
    throw new Error("The offline demo story could not be created.");
  }
  addPaidInvoices(world, today(), getEnv().SANDBOX_BUYER_EMAIL ?? "");
}

// The one fake PayPal of this process. The first caller seeds the demo story and every other caller
// waits for it, so nobody sees a half-made story.
export async function offlinePayPal(): Promise<FakePayPal> {
  if (seeding.getStore()) return world;
  ready ??= seeding.run(true, seed).catch((error: unknown) => {
    ready = undefined;
    throw error;
  });
  await ready;
  return world;
}
