import { generateText } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { suggestionQuestion } from "@/components/shared/language-suggestion";
import { languageSuggestionFor, suggestedLanguage } from "@/lib/reminders/country-language";
import { listReminderDrafts } from "@/lib/reminders/reminder-drafts";
import { LANGUAGES } from "@/lib/reminders/languages";
import { createMemoryStore } from "@/lib/store/memory-store";
import { createPostgresStore } from "@/lib/store/postgres-store";
import type { Store } from "@/lib/store/store";
import type { InvoiceSummary } from "@/types";
import { stubEnv } from "../support/env";
import { OKAFOR, overdueInvoice } from "../support/summaries";

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));

const loader = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock("@/lib/paypal/summaries", () => ({ loadInvoices: loader.loadInvoices }));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

function load(summaries: InvoiceSummary[]): void {
  loader.loadInvoices.mockResolvedValue(
    summaries.map((summary) => ({
      summary,
      amountDue: summary.amount,
      underLut: false,
      paymentId: null,
      marker: "dueline-request:test",
    })),
  );
}

describe("suggestedLanguage", () => {
  it.each([
    ["PT", "pt"],
    ["BR", "pt"],
    ["DE", "de"],
    ["AT", "de"],
    ["CH", "de"],
    ["FR", "fr"],
    ["LU", "fr"],
    ["ES", "es"],
    ["MX", "es"],
    ["AR", "es"],
    ["CO", "es"],
    ["CL", "es"],
    ["PE", "es"],
    ["NL", "nl"],
  ])("suggests %s for a client in %s", (country, language) => {
    expect(suggestedLanguage(country)).toBe(language);
  });

  it.each(["IN", "BE", "US", "GB", "CA", "AU", "XX", "", null, undefined])(
    "suggests nothing for %s",
    (country) => {
      expect(suggestedLanguage(country)).toBeNull();
    },
  );

  it("ignores the case of the code", () => {
    expect(suggestedLanguage("pt")).toBe("pt");
  });

  it("only ever suggests a language the reminders are written in", () => {
    const supported = LANGUAGES.map(({ code }) => code);
    for (const country of ["PT", "BR", "DE", "AT", "CH", "FR", "LU", "ES", "MX", "NL"]) {
      expect(supported).toContain(suggestedLanguage(country));
    }
  });
});

describe("languageSuggestionFor", () => {
  it("suggests until a language has been chosen, and never after", () => {
    expect(languageSuggestionFor("PT", false)).toBe("pt");
    expect(languageSuggestionFor("PT", true)).toBeNull();
    expect(languageSuggestionFor("US", false)).toBeNull();
  });
});

describe("suggestionQuestion", () => {
  it("names the client, the country and the language", () => {
    expect(suggestionQuestion("Okafor & Reyes", "PT", "pt")).toBe(
      "Okafor & Reyes is in Portugal. Write reminders in Portuguese?",
    );
    expect(suggestionQuestion("Kraftwerk Studio", "DE", "de")).toBe(
      "Kraftwerk Studio is in Germany. Write reminders in German?",
    );
  });
});

describe("whether a client's language was chosen, in the memory store", () => {
  it("is false until a language is saved, and true after any choice, English included", async () => {
    const memory = createMemoryStore();
    expect(await memory.hasClientLanguage("okafor-reyes")).toBe(false);
    expect(await memory.getClientLanguage("okafor-reyes")).toBe("en");

    await memory.saveClientLanguage("okafor-reyes", "en");
    expect(await memory.hasClientLanguage("okafor-reyes")).toBe(true);
    expect(await memory.hasClientLanguage("brightwell-labs")).toBe(false);
  });

  it("forgets every choice when asked", async () => {
    const memory = createMemoryStore();
    await memory.saveClientLanguage("okafor-reyes", "pt");
    await memory.clearClientLanguages();
    expect(await memory.hasClientLanguage("okafor-reyes")).toBe(false);
    expect(await memory.getClientLanguage("okafor-reyes")).toBe("en");
  });
});

describe("whether a client's language was chosen, in the Postgres store", () => {
  type Sql = Parameters<typeof createPostgresStore>[0];

  function fakeSql(...results: unknown[][]): { sql: Sql; queries: string[] } {
    const queue = [...results];
    const queries: string[] = [];
    const tag = async (strings: TemplateStringsArray): Promise<unknown[]> => {
      queries.push(strings.join("?"));
      return queue.shift() ?? [];
    };
    return {
      sql: Object.assign(tag, { json: (value: unknown) => value }) as unknown as Sql,
      queries,
    };
  }

  it("reads the flag, and false when the client has no row", async () => {
    const { sql } = fakeSql([{ language_chosen: true }], []);
    const postgres = createPostgresStore(sql);
    expect(await postgres.hasClientLanguage("okafor-reyes")).toBe(true);
    expect(await postgres.hasClientLanguage("brightwell-labs")).toBe(false);
  });

  it("marks the language chosen when it is saved, whatever the language", async () => {
    const { sql, queries } = fakeSql([]);
    await createPostgresStore(sql).saveClientLanguage("okafor-reyes", "en");
    expect(queries[0]).toContain("language_chosen");
    expect(queries[0]).toContain("true");
  });

  it("clears the choices", async () => {
    const { sql, queries } = fakeSql([]);
    await createPostgresStore(sql).clearClientLanguages();
    expect(queries[0]).toContain("language_chosen = false");
  });
});

describe("the suggestion on a reminder draft", () => {
  beforeEach(() => {
    store = createMemoryStore();
    stubEnv({ DEMO_TODAY: "2026-10-31" });
    vi.mocked(generateText).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  const inPortugal = overdueInvoice("2026-10-24", 7, { ...OKAFOR, country: "PT" });

  it("offers Portuguese to a client in Portugal and keeps the draft in English", async () => {
    load([inPortugal]);
    const [draft] = await listReminderDrafts();
    expect(draft).toMatchObject({ language: "en", languageSuggestion: "pt" });
  });

  it("stops offering once Keep English is saved, and the draft stays English", async () => {
    load([inPortugal]);
    await store.saveClientLanguage("okafor-reyes", "en");
    const [draft] = await listReminderDrafts();
    expect(draft).toMatchObject({ language: "en", languageSuggestion: null });
  });

  it("writes in Portuguese and stops offering once Use Portuguese is saved", async () => {
    load([inPortugal]);
    await store.saveClientLanguage("okafor-reyes", "pt");
    const [draft] = await listReminderDrafts();
    expect(draft).toMatchObject({ language: "pt", languageSuggestion: null });
  });

  it("offers nothing to a client in the US or with no country", async () => {
    load([
      overdueInvoice("2026-10-24", 7, { ...OKAFOR, country: "US" }),
      overdueInvoice("2026-10-24", 7, { name: "Nowhere Ltd", email: "n@x.example" }),
    ]);
    const drafts = await listReminderDrafts();
    expect(drafts.map((draft) => draft.languageSuggestion)).toEqual([null, null]);
  });
});
