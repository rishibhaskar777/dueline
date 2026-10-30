import { generateText } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/invoices/extract/route";
import type { ModelDraft } from "@/lib/ai/check-draft";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { STUB_HEADER } from "@/app/api/_lib/stub";
import { apiCallError, haldenGuess, noObjectError } from "../support/ai";
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
  DEMO_TODAY: "2026-10-28",
};

function extract(chat: string, address = "198.51.100.1"): Promise<Response> {
  return POST(
    new Request("http://localhost:3000/api/invoices/extract", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `${address}, 10.0.0.1` },
      body: JSON.stringify({ chat }),
    }),
  );
}

function modelAnswers(output: ModelDraft): void {
  vi.mocked(generateText).mockResolvedValue({ output } as unknown as Awaited<
    ReturnType<typeof generateText>
  >);
}

const chatNumber = (n: number): string =>
  `Mike: job ${n}, logos for $120 each, send it to mike@haldencoffee.example`;

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

describe("POST /api/invoices/extract", () => {
  it("returns the draft, warnings, no risk yet and the masked counts", async () => {
    modelAnswers(haldenGuess);
    const response = await extract(chatNumber(1));

    expect(response.status).toBe(200);
    expect(response.headers.get(STUB_HEADER)).toBeNull();
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(["draft", "masked", "risk", "warnings"]);
    expect(body.risk).toBeNull();
    expect(body.masked).toEqual({ emails: 1, phones: 0 });
    expect(body.draft.client.email).toBe("mike@haldencoffee.example");
    expect(body.draft.items).toHaveLength(2);
  });

  it("answers 400 for a chat of 6,001 characters and does not call the model", async () => {
    const response = await extract("x".repeat(6001));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("answers 503 ai_unavailable without an API key", async () => {
    stubEnv({ DEMO_TODAY: "2026-10-28" });
    const response = await extract(chatNumber(1));
    expect(response.status).toBe(503);
    const { error } = await response.json();
    expect(error.code).toBe("ai_unavailable");
    expect(error.message).toBe(
      "AI is unavailable right now. You can still fill the invoice by hand.",
    );
    expect(generateText).not.toHaveBeenCalled();
  });

  it("answers 503 ai_unavailable when both models fail", async () => {
    vi.mocked(generateText).mockRejectedValue(apiCallError(429));
    const response = await extract(chatNumber(1));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("ai_unavailable");
    expect(generateText).toHaveBeenCalledTimes(2);
  });

  it("answers 422 extraction_failed when no item is usable", async () => {
    modelAnswers({ ...haldenGuess, items: [] });
    const response = await extract(chatNumber(1));
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("extraction_failed");
  });

  it("answers 422 extraction_failed when the model gives no valid answer", async () => {
    vi.mocked(generateText).mockRejectedValue(noObjectError());
    expect((await extract(chatNumber(1))).status).toBe(422);
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("answers 429 from the 11th extraction in an hour, per address", async () => {
    modelAnswers(haldenGuess);
    for (let n = 1; n <= 10; n++) expect((await extract(chatNumber(n))).status).toBe(200);

    const blocked = await extract(chatNumber(11));
    expect(blocked.status).toBe(429);
    const { error } = await blocked.json();
    expect(error.code).toBe("rate_limited");
    expect(error.message).toContain("Try again in about 60 minutes");

    expect((await extract(chatNumber(11), "198.51.100.2")).status).toBe(200);
  });

  it("does not count a chat it has already answered towards the limit", async () => {
    modelAnswers(haldenGuess);
    for (let n = 1; n <= 12; n++) expect((await extract(chatNumber(1))).status).toBe(200);
    expect(generateText).toHaveBeenCalledTimes(1);
    expect((await extract(chatNumber(2))).status).toBe(200);
  });

  it("answers 503 ai_unavailable once the app's daily allowance is used", async () => {
    modelAnswers(haldenGuess);
    for (let call = 1; call <= 400; call++) await store.hitRateLimit("ai-calls:2026-10-28", 86_400);

    const response = await extract(chatNumber(1));
    expect(response.status).toBe(503);
    const { error } = await response.json();
    expect(error.code).toBe("ai_unavailable");
    expect(error.message).toBe(
      "Dueline's daily AI allowance is used up. You can still fill the invoice by hand.",
    );
    expect(generateText).not.toHaveBeenCalled();
  });

  it("still answers a stored chat after the daily allowance is used", async () => {
    modelAnswers(haldenGuess);
    expect((await extract(chatNumber(1))).status).toBe(200);
    for (let call = 1; call <= 400; call++) await store.hitRateLimit("ai-calls:2026-10-28", 86_400);
    expect((await extract(chatNumber(1))).status).toBe(200);
  });

  it("does not log the chat, emails or model output", async () => {
    vi.mocked(generateText).mockRejectedValue(apiCallError(500));
    await extract(chatNumber(1));
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain("haldencoffee");
    expect(logged).not.toContain("logos");
  });
});
