import "server-only";
import { today } from "@/lib/clock";
import { assertSandboxBuyers } from "@/lib/demo-guard";
import { ConfigError, getEnv } from "@/lib/env";
import { PayPalApiError } from "@/lib/paypal/errors";
import { toPayPalInvoice } from "@/lib/paypal/invoice-body";
import {
  createDraftInvoice,
  nextInvoiceNumber,
  recordExternalPayment,
  sendInvoice,
} from "@/lib/paypal/invoices";
import { markerOf } from "@/lib/paypal/memo";
import { listInvoicesInFull } from "@/lib/paypal/summaries";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { getProfile } from "@/lib/profile";
import { getStore } from "@/lib/store";
import type { Profile } from "@/types";
import { storyActivityId, storyMoment } from "./story-events";
import {
  buildDemoProfile,
  buildDemoStory,
  demoMemo,
  isDemoProfile,
  type DemoInvoice,
} from "./story";

type SeedResult = "created" | "repaired" | "skipped" | "failed";

export interface SeedRow {
  key: string;
  client: string;
  result: SeedResult;
  invoice?: string;
  note?: string;
}

const PAYMENT_NOTE = "Paid by bank transfer, recorded for the demo history.";
const OPEN_STATUSES = ["SENT", "UNPAID"];

function buyerEmail(): string {
  const email = getEnv().SANDBOX_BUYER_EMAIL;
  if (!email) {
    throw new ConfigError(
      "SANDBOX_BUYER_EMAIL is not set. The demo needs a sandbox buyer address.",
    );
  }
  assertSandboxBuyers([email]);
  return email;
}

// A profile the freelancer typed is never replaced. The demo fills in when there is none or when the
// saved one has no name at all, and keeps its own LUT date current.
export async function ensureDemoProfile(date: string): Promise<Profile> {
  const store = getStore();
  const saved = await getProfile();
  const stored = await store.getProfile();
  const unnamed = saved.yourName === "" && saved.businessName === "";
  if (!stored || unnamed || isDemoProfile(saved, date)) {
    await store.saveProfile(buildDemoProfile(date));
  }
  return getProfile();
}

async function createDraft(
  generation: number,
  story: DemoInvoice,
  email: string,
  profile: Profile,
): Promise<PayPalInvoice> {
  const requestId = crypto.randomUUID();
  const body = toPayPalInvoice(
    {
      client: { name: story.clientName, email, country: story.country },
      currency: story.amount.currency,
      dueOn: story.dueOn,
      items: [
        {
          name: story.work,
          quantity: 1,
          unitAmount: story.amount.value,
          sac: profile.defaultSac,
        },
      ],
      purposeCode: story.purposeCode,
      includeLutNote: profile.lutArn !== null,
    },
    { invoiceNumber: await nextInvoiceNumber(), invoiceDate: story.issuedOn, requestId, profile },
  );
  const marked = {
    ...body,
    detail: {
      ...body.detail,
      memo: demoMemo(generation, story.key, story.purposeCode, profile.defaultSac),
    },
  };
  return createDraftInvoice(marked, requestId);
}

async function send(invoice: PayPalInvoice): Promise<void> {
  await sendInvoice(invoice.id, crypto.randomUUID());
}

// A story invoice that is a draft or is open but should be history was left half done by an
// earlier run, so only the missing steps are taken.
async function finish(
  generation: number,
  story: DemoInvoice,
  found: PayPalInvoice | undefined,
  email: string,
  profile: Profile,
): Promise<{ result: SeedResult; invoice: PayPalInvoice }> {
  const existing = found ?? (await createDraft(generation, story, email, profile));
  let acted = found === undefined;

  if (existing.status === "DRAFT") {
    await send(existing);
    acted = true;
  }
  const open = existing.status === "DRAFT" || OPEN_STATUSES.includes(existing.status);
  if (story.paidOn && open) {
    await recordExternalPayment(existing.id, { paymentDate: story.paidOn, note: PAYMENT_NOTE });
    acted = true;
  }
  const result: SeedResult = found === undefined ? "created" : acted ? "repaired" : "skipped";
  return { result, invoice: existing };
}

// The feed and the invoice page show the story on its own dates. The rows have fixed ids, so a repeat
// or a later webhook for the same invoice adds nothing. The reminder is local history only: it is
// written to Dueline's reminder log and nothing is sent to PayPal.
async function recordHistory(
  generation: number,
  story: DemoInvoice,
  invoice: PayPalInvoice,
): Promise<void> {
  const store = getStore();
  const event = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.detail.invoice_number,
    clientName: story.clientName,
    amount: story.amount,
  };
  await store.addActivity({
    ...event,
    id: storyActivityId(generation, story.key, "sent"),
    kind: "sent",
    at: storyMoment(story.issuedOn),
  });
  if (story.paidOn) {
    await store.addActivity({
      ...event,
      id: storyActivityId(generation, story.key, "paid"),
      kind: "paid",
      at: storyMoment(story.paidOn),
    });
  }
  if (story.reminder && (await store.reminderHistory(invoice.id)).length === 0) {
    await store.logReminder({
      invoiceId: invoice.id,
      tone: story.reminder.tone,
      sentAt: storyMoment(story.reminder.sentOn),
      channel: "paypal",
    });
  }
}

function failureNote(error: unknown): string {
  if (error instanceof PayPalApiError) {
    console.error("Seeding a demo invoice failed", { debugId: error.debugId });
    return `PayPal returned an error: ${error.message}`;
  }
  console.error("Seeding a demo invoice failed");
  return error instanceof Error ? error.message : "Unknown error.";
}

// Creates the invoices of one story generation that PayPal does not have yet, one at a time because
// PayPal hands out invoice numbers in order. One failure does not stop the rest, and running it again
// repairs it.
export async function seedDemo(generation: number): Promise<SeedRow[]> {
  const email = buyerEmail();
  const profile = await ensureDemoProfile(today());
  const listed = await listInvoicesInFull();
  const rows: SeedRow[] = [];

  for (const story of buildDemoStory(today())) {
    const base = { key: story.key, client: story.clientName };
    const found = listed.find(
      (invoice) =>
        markerOf(invoice.detail.memo) === demoMemo(generation, story.key) &&
        invoice.status !== "CANCELLED",
    );
    try {
      const { result, invoice } = await finish(generation, story, found, email, profile);
      await recordHistory(generation, story, invoice);
      rows.push({ ...base, result, invoice: invoice.detail.invoice_number });
    } catch (error) {
      rows.push({ ...base, result: "failed", note: failureNote(error) });
    }
  }
  return rows;
}

// Starts the next generation, dated from today, and seeds it. The generation is recorded first, so
// the older ones stop being shown at once even if a seeding step fails and has to be repeated. The
// queued reminders belonged to the old story, so they go too; the next preparation run refills them.
export async function seedNewGeneration(): Promise<{ generation: number; rows: SeedRow[] }> {
  const store = getStore();
  const generation = ((await store.getDemoGeneration())?.id ?? 0) + 1;
  await store.saveDemoGeneration({ id: generation, seededOn: today() });
  await store.replaceQueueItems("reminder", []);
  return { generation, rows: await seedDemo(generation) };
}
