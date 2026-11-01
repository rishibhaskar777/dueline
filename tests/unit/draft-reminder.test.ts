import { generateText } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiQuotaError, reserveDailyModelCall } from "@/lib/ai/quota";
import { draftReminderText } from "@/lib/reminders/draft-reminder";
import type { ReminderFacts } from "@/lib/reminders/facts";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { apiCallError, noObjectError } from "../support/ai";
import { stubEnv } from "../support/env";

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const AI_ENV = {
  GEMINI_API_KEY: "test-key",
  GEMINI_MODEL: "primary-model",
  GEMINI_FALLBACK_MODEL: "fallback-model",
  DEMO_TODAY: "2026-10-31",
};

const facts: ReminderFacts = {
  invoiceId: "INV2-OKRZ",
  invoiceNumber: "INV-0044",
  clientName: "Okafor & Reyes",
  work: "Brand guidelines",
  amount: { currency: "EUR", value: "720.00" },
  issuedOn: "2026-10-01",
  dueOn: "2026-10-10",
  daysLate: 21,
  remindersSent: 0,
};

const goodAnswer = {
  subject: "Invoice INV-0044 is now 21 days overdue",
  message:
    "Hi Okafor & Reyes team,\n\nInvoice INV-0044 for EUR 720.00 is now 21 days overdue. Could you please pay it using the Pay now button in the PayPal email?\n\nThank you",
};

function modelAnswers(output: { subject: string; message: string }): void {
  vi.mocked(generateText).mockResolvedValue({ output } as unknown as Awaited<
    ReturnType<typeof generateText>
  >);
}

beforeEach(() => {
  store = createMemoryStore();
  stubEnv(AI_ENV);
  vi.mocked(generateText).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("draftReminderText", () => {
  it("uses the model's draft when it passes the checks", async () => {
    modelAnswers(goodAnswer);
    expect(await draftReminderText(facts, "firm")).toEqual({ ...goodAnswer, source: "ai" });
  });

  it("falls back to the template when the model changes the amount", async () => {
    modelAnswers({ ...goodAnswer, message: goodAnswer.message.replace("720.00", "7200.00") });
    const draft = await draftReminderText(facts, "firm");
    expect(draft.source).toBe("template");
    expect(draft.message).toContain("EUR 720.00");
  });

  it.each([
    ["a link", "Pay at https://pay.example.org please."],
    ["an email address", "Write to ana@okafor.example please."],
  ])("falls back to the template when the model writes %s", async (_name, extra) => {
    modelAnswers({ ...goodAnswer, message: `${goodAnswer.message}\n${extra}` });
    expect((await draftReminderText(facts, "firm")).source).toBe("template");
  });

  it("falls back to the template when the invoice number is missing", async () => {
    modelAnswers({
      ...goodAnswer,
      message: goodAnswer.message.replace("INV-0044", "your invoice"),
    });
    expect((await draftReminderText(facts, "firm")).source).toBe("template");
  });

  it("falls back to the template when the model gives no valid answer", async () => {
    vi.mocked(generateText).mockRejectedValue(noObjectError());
    expect((await draftReminderText(facts, "firm")).source).toBe("template");
  });

  it("falls back to the template when both models fail", async () => {
    vi.mocked(generateText).mockRejectedValue(apiCallError(429));
    expect((await draftReminderText(facts, "firm")).source).toBe("template");
  });

  it("falls back to the template without an API key", async () => {
    stubEnv({ DEMO_TODAY: "2026-10-31" });
    expect((await draftReminderText(facts, "firm")).source).toBe("template");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("answers a repeat from the cache without a second model call", async () => {
    modelAnswers(goodAnswer);
    const beforeModelCall = vi.fn().mockResolvedValue(undefined);
    await draftReminderText(facts, "firm", { beforeModelCall });
    const again = await draftReminderText(facts, "firm", { beforeModelCall });

    expect(again).toEqual({ ...goodAnswer, source: "ai" });
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(beforeModelCall).toHaveBeenCalledTimes(1);
  });

  it("keeps a draft per tone and per number of days late", async () => {
    modelAnswers(goodAnswer);
    await draftReminderText(facts, "firm");
    await draftReminderText(facts, "gentle");
    await draftReminderText(facts, "firm");
    await draftReminderText({ ...facts, daysLate: 22 }, "firm");
    expect(generateText).toHaveBeenCalledTimes(3);
  });

  it("does not cache a template", async () => {
    vi.mocked(generateText).mockRejectedValueOnce(noObjectError());
    expect((await draftReminderText(facts, "firm")).source).toBe("template");

    modelAnswers(goodAnswer);
    expect((await draftReminderText(facts, "firm")).source).toBe("ai");
  });

  it("uses the template once the app's daily allowance is used up", async () => {
    modelAnswers(goodAnswer);
    for (let call = 1; call <= 400; call++) await store.hitRateLimit("ai-calls:2026-10-31", 86_400);

    const draft = await draftReminderText(facts, "firm", {
      beforeModelCall: reserveDailyModelCall,
    });
    expect(draft.source).toBe("template");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("lets a per-address limit reach the caller", async () => {
    const limit = new AiQuotaError("address", "Try again in about 60 minutes.");
    await expect(
      draftReminderText(facts, "firm", { beforeModelCall: () => Promise.reject(limit) }),
    ).rejects.toBe(limit);
  });

  it("writes the template without asking the model when running offline", async () => {
    stubEnv({ ...AI_ENV, DUELINE_OFFLINE: "true" });
    modelAnswers(goodAnswer);
    const beforeModelCall = vi.fn(async () => {});

    const draft = await draftReminderText(facts, "firm", { beforeModelCall });

    expect(draft.source).toBe("template");
    expect(draft.subject).toContain("INV-0044");
    expect(generateText).not.toHaveBeenCalled();
    expect(beforeModelCall).not.toHaveBeenCalled();
  });

  it("sends the model no email address, even when the client is named by one", async () => {
    modelAnswers(goodAnswer);
    await draftReminderText({ ...facts, clientName: "accounts@okaforreyes.example.com" }, "gentle");

    const { prompt } = vi.mocked(generateText).mock.calls[0][0] as { prompt: string };
    expect(prompt).not.toContain("@");
    expect(prompt).toContain("INV-0044");
    expect(prompt).toContain("EUR 720.00");
  });
});
