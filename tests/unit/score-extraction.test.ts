import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkModelDraft, modelDraftSchema } from "@/lib/ai/check-draft";
import { extractionRequest } from "@/lib/ai/extract-invoice";
import {
  expectedExtractionSchema,
  renderEvaluation,
  renderModels,
  renderReadmeTable,
  renderTotals,
  scoreExtraction,
  tally,
  type ChatScore,
  type EvaluatedChat,
  type ExpectedExtraction,
  type ExtractionOutcome,
} from "@/lib/ai/score-extraction";
import { addDays } from "@/lib/date-math";
import { maskContacts } from "@/lib/privacy/mask";

const TODAY = "2026-11-04";
const CHATS_DIR = join(process.cwd(), "tests", "fixtures", "chats");
const answers = JSON.parse(readFileSync(join(CHATS_DIR, "model-answers.json"), "utf8")) as Record<
  string,
  unknown
>;

function chatOf(id: string): string {
  return readFileSync(join(CHATS_DIR, id, "chat.txt"), "utf8");
}

function expectedOf(id: string): ExpectedExtraction {
  return expectedExtractionSchema.parse(
    JSON.parse(readFileSync(join(CHATS_DIR, id, "expected.json"), "utf8")),
  );
}

// The same steps the extraction takes after the model answers, with a stored answer in its place.
function outcomeFor(id: string): ExtractionOutcome {
  const chat = chatOf(id);
  const contacts = maskContacts(chat);
  const { draft, warnings, paymentTerms } = checkModelDraft(modelDraftSchema.parse(answers[id]), {
    chat,
    contacts,
    today: TODAY,
  });
  const { system, prompt } = extractionRequest(contacts.masked, TODAY);
  return {
    draft: draft.items.length > 0 ? draft : null,
    warnings,
    paymentTerms,
    sent: `${system}\n${prompt}`,
  };
}

function scoreOf(id: string): ChatScore {
  return scoreExtraction(expectedOf(id), outcomeFor(id), TODAY);
}

describe("the chat fixtures", () => {
  const ids = readdirSync(CHATS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  it("hold 27 chats that each have an expected answer", () => {
    expect(ids).toHaveLength(27);
    for (const id of ids) {
      expect(() => expectedOf(id), id).not.toThrow();
      expect(chatOf(id).length, id).toBeLessThanOrEqual(6000);
    }
  });

  it("cover every supported currency, an unsupported one, an injection and a chat without prices", () => {
    const all = ids.map(expectedOf);
    for (const currency of ["USD", "EUR", "GBP", "CAD", "AUD"]) {
      expect(
        all.some((expected) => expected.currency === currency),
        currency,
      ).toBe(true);
    }
    expect(all.some((expected) => expected.warnings.includes("currency_not_found"))).toBe(true);
    expect(all.filter((expected) => expected.warnings.includes("injection"))).toHaveLength(1);
    expect(all.filter((expected) => expected.items.length === 0)).toHaveLength(1);
  });

  it("list every email address and phone number the chat holds", () => {
    for (const id of ids) {
      const found = maskContacts(chatOf(id));
      for (const contact of [...found.emails, ...found.phones]) {
        expect(expectedOf(id).contacts, `${id}: ${contact}`).toContain(contact);
      }
    }
  });

  it("use only example.com style addresses", () => {
    for (const id of ids) {
      for (const email of maskContacts(chatOf(id)).emails) {
        expect(email, id).toMatch(/example\.com$/);
      }
    }
  });
});

describe("scoreExtraction", () => {
  it("passes every check for a draft that matches", () => {
    const score = scoreOf("01-logo-pack");
    expect(score.passed).toEqual({
      client: true,
      currency: true,
      lines: true,
      names: true,
      prices: true,
      due: true,
      warnings: true,
      contacts: true,
    });
    expect(score.misses).toEqual([]);
    expect(score.unexpectedWarnings).toEqual([]);
  });

  it("checks the country only for a chat that states one", () => {
    expect(scoreOf("25-country-stated").passed).toMatchObject({ country: true });
    expect(scoreOf("01-logo-pack").passed).not.toHaveProperty("country");
  });

  it("checks the purpose code only for a chat that has a clear answer", () => {
    expect(scoreOf("26-brand-kit-p1099").passed).toEqual({
      client: true,
      currency: true,
      purpose: true,
      lines: true,
      names: true,
      prices: true,
      due: true,
      warnings: true,
      contacts: true,
    });
    expect(scoreOf("01-logo-pack").passed).not.toHaveProperty("purpose");
  });

  it("checks the upfront share and the contact person only for a chat that has them", () => {
    expect(scoreOf("27-whatsapp-upfront").passed).toEqual({
      client: true,
      currency: true,
      purpose: true,
      lines: true,
      names: true,
      prices: true,
      due: true,
      warnings: true,
      contacts: true,
      upfront: true,
      person: true,
    });
    expect(scoreOf("01-logo-pack").passed).not.toHaveProperty("upfront");
    expect(scoreOf("01-logo-pack").passed).not.toHaveProperty("person");
  });

  it("fails the upfront check when the share is missed and the person when it is another", () => {
    const outcome = outcomeFor("27-whatsapp-upfront");
    const missed = {
      ...outcome,
      paymentTerms: null,
      draft: outcome.draft && {
        ...outcome.draft,
        client: { ...outcome.draft.client, contactName: "Riya" },
      },
    };
    const score = scoreExtraction(expectedOf("27-whatsapp-upfront"), missed, TODAY);
    expect(score.passed).toMatchObject({ upfront: false, person: false });
    expect(score.misses).toContain("upfront: expected 50%, got none");
    expect(score.misses).toContain('person: expected "Lena Fischer", got "Riya"');
  });

  it("fails the purpose check when the code is not the expected one", () => {
    const outcome = outcomeFor("26-brand-kit-p1099");
    const wrong = {
      ...outcome,
      draft: outcome.draft && { ...outcome.draft, purposeCode: "P1007" },
    };
    const score = scoreExtraction(expectedOf("26-brand-kit-p1099"), wrong, TODAY);
    expect(score.passed.purpose).toBe(false);
    expect(score.misses).toContain("purpose: expected P1099, got P1007");
  });

  it("fails the items and prices of a draft that applied a discount nobody agreed to", () => {
    const score = scoreOf("05-discount-mentioned");
    expect(score.passed).toMatchObject({ client: true, lines: false, names: false, prices: false });
    expect(score.misses).toContain("prices: expected prices 400.00, got 360.00");
  });

  it("fails the items but not the prices when only a quantity is wrong", () => {
    const score = scoreOf("13-hinglish-logo");
    expect(score.passed).toMatchObject({ lines: false, names: false, prices: true });
    expect(score.misses[0]).toContain(
      "expected 1 x 150.00 (logo), 2 x 30.00 (revision) in USD, got 1 x 150.00 (Logo), 1 x 30.00 (Revision) in USD",
    );
  });

  it("flags a chat that gives the AI orders even when the draft follows them", () => {
    const score = scoreOf("10-prompt-injection");
    expect(score.passed).toMatchObject({ injection: true, lines: false, prices: false });
  });

  it("counts an unsupported currency as right when it raised the warning", () => {
    expect(scoreOf("12-unsupported-currency").passed).toMatchObject({
      currency: true,
      lines: true,
      warnings: true,
    });
  });

  it("expects no draft at all for a chat without prices", () => {
    expect(scoreOf("11-no-prices").passed).toEqual({
      lines: true,
      names: true,
      prices: true,
      contacts: true,
    });
  });

  it("checks that a missing email and a past due date raised their warnings", () => {
    expect(scoreOf("22-no-email").passed.warnings).toBe(true);
    expect(scoreOf("23-past-date").passed).toMatchObject({ due: true, warnings: true });
  });

  it("counts a phone number or address in the text sent to the model as a leak", () => {
    const expected = expectedOf("09-phone-number");
    const outcome = outcomeFor("09-phone-number");
    expect(scoreExtraction(expected, outcome, TODAY).passed.contacts).toBe(true);

    for (const leak of [
      "Call +1 415 555 0134",
      "call 1-415-555-0134",
      "Jordan@HarborLight-example.com",
    ]) {
      const leaked = { ...outcome, sent: `${outcome.sent}\n${leak}` };
      expect(scoreExtraction(expected, leaked, TODAY).passed.contacts, leak).toBe(false);
    }
  });

  it("reads the due date from the payment rule of the chat", () => {
    const expected = expectedOf("02-retainer-net30");
    const draft = outcomeFor("01-logo-pack").draft;
    const outcome = (dueOn: string | null): ExtractionOutcome => ({
      draft: draft && { ...draft, dueOn },
      warnings: [],
      sent: "",
    });
    expect(scoreExtraction(expected, outcome(addDays(TODAY, 30)), TODAY).passed.due).toBe(true);
    expect(scoreExtraction(expected, outcome(addDays(TODAY, 14)), TODAY).passed.due).toBe(false);
  });

  it("lists warnings the chat was not expected to raise", () => {
    const score = scoreExtraction(
      expectedOf("02-retainer-net30"),
      outcomeFor("01-logo-pack"),
      TODAY,
    );
    expect(score.unexpectedWarnings).toEqual([
      "No due date in the chat; set to 14 days from today. Change it if needed.",
    ]);
  });
});

describe("items compared as numbers and plain words", () => {
  const expected = {
    ...expectedOf("01-logo-pack"),
    items: [{ nameIncludes: "Hours", quantity: 12, unitAmount: "65.00" }],
  };
  const outcome = (name: string, unitAmount: string): ExtractionOutcome => {
    const base = outcomeFor("01-logo-pack");
    return {
      ...base,
      draft: base.draft && {
        ...base.draft,
        items: [{ ...base.draft.items[0], name, quantity: 12, unitAmount }],
      },
    };
  };

  it("counts 12 x 65 as 12 x 65.00, whatever the case and spacing of the name", () => {
    const score = scoreExtraction(expected, outcome("  consulting  HOURS", "65"), TODAY);
    expect(score.passed).toMatchObject({ lines: true, names: true, prices: true });
  });

  it("passes the lines but not the names when only the wording differs", () => {
    const score = scoreExtraction(expected, outcome("Pricing page help", "65.00"), TODAY);
    expect(score.passed).toMatchObject({ lines: true, names: false, prices: true });
    expect(score.misses).toEqual([
      "names: expected 12 x 65.00 (Hours), got 12 x 65.00 (Pricing page help)",
    ]);
  });

  it("fails the lines when a price or quantity is wrong, and lists that miss once", () => {
    const score = scoreExtraction(expected, outcome("Hours", "60.00"), TODAY);
    expect(score.passed).toMatchObject({ lines: false, names: false, prices: false });
    expect(score.misses.filter((miss) => miss.startsWith("lines:"))).toHaveLength(1);
    expect(score.misses.some((miss) => miss.startsWith("names:"))).toBe(false);
  });

  it("compares the lines in any order", () => {
    const two = {
      ...expectedOf("01-logo-pack"),
      items: [
        { nameIncludes: "logo", quantity: 3, unitAmount: "150.00" },
        { nameIncludes: "sheet", quantity: 1, unitAmount: "90.00" },
      ],
    };
    const base = outcomeFor("01-logo-pack");
    const swapped = {
      ...base,
      draft: base.draft && { ...base.draft, items: [...base.draft.items].reverse() },
    };
    expect(scoreExtraction(two, swapped, TODAY).passed).toMatchObject({ lines: true, names: true });
  });

  it("fails the lines when the draft has another line or the wrong currency", () => {
    const base = outcomeFor("01-logo-pack");
    const extra = {
      ...base,
      draft: base.draft && {
        ...base.draft,
        items: [...base.draft.items, { ...base.draft.items[0], name: "Extra" }],
      },
    };
    const euros = { ...base, draft: base.draft && { ...base.draft, currency: "EUR" as const } };
    const expectedLogo = expectedOf("01-logo-pack");
    expect(scoreExtraction(expectedLogo, extra, TODAY).passed.lines).toBe(false);
    expect(scoreExtraction(expectedLogo, euros, TODAY).passed.lines).toBe(false);
  });
});

describe("tally and renderEvaluation", () => {
  const chats: EvaluatedChat[] = [
    { id: "01-logo-pack", summary: "Plain job", score: scoreOf("01-logo-pack"), model: "model-x" },
    {
      id: "13-hinglish-logo",
      summary: "Hinglish",
      score: scoreOf("13-hinglish-logo"),
      model: "model-y",
    },
    { id: "99-not-run", summary: "", error: "not run: the allowance is used up" },
  ];

  it("counts a check only over the chats it applies to", () => {
    const totals = tally(chats.flatMap((chat) => ("score" in chat ? [chat.score] : [])));
    expect(totals.lines).toEqual({ passed: 1, total: 2 });
    expect(totals.names).toEqual({ passed: 1, total: 2 });
    expect(totals.prices).toEqual({ passed: 2, total: 2 });
    expect(totals.injection).toEqual({ passed: 0, total: 0 });
  });

  it("writes totals, a row per chat and what differed", () => {
    const report = renderEvaluation({ model: "model-x", date: TODAY, chats });
    expect(report).toContain("Run on 2026-11-04 with `model-x`, over 3 chats");
    expect(report).toContain("| Item lines right | 1 of 2 | 50% |");
    expect(report).toContain("| Injection flagged | 0 of 0 | n/a |");
    expect(report).toContain(
      "| 01-logo-pack | model-x | pass | pass | n/a | pass | pass | pass | pass | pass | n/a | n/a | pass | n/a | n/a |",
    );
    expect(report).toContain(
      "| 13-hinglish-logo | model-y | pass | pass | n/a | FAIL | FAIL | pass |",
    );
    expect(report).toContain("| 99-not-run | not run: the allowance is used up |");
    expect(report).toContain("**13-hinglish-logo** (Hinglish)");
    expect(report).toContain("- lines: expected 1 x 150.00 (");
  });

  it("prints the totals in the shape of the report, from the chats that were scored", () => {
    const totals = renderTotals(chats);
    expect(totals.split("\n").slice(0, 2)).toEqual([
      "| Check | Passed | Share |",
      "| --- | --- | --- |",
    ]);
    expect(totals).toContain("| Item lines right | 1 of 2 | 50% |");
    expect(totals).toContain("| Purpose code right | 0 of 0 | n/a |");
    expect(totals).not.toContain("99-not-run");
  });

  it("prints the README table with its own wording and a purpose code row", () => {
    const table = renderReadmeTable(chats);
    const cells = table.split("\n").map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
    expect(cells[0]).toEqual(["Check", "Result"]);
    expect(cells).toContainEqual(["Item lines right", "50%"]);
    expect(cells).toContainEqual(["Purpose code right", "n/a"]);
    expect(cells).toContainEqual(["Prompt injection flagged", "n/a"]);
  });

  it("prints the README table in the README's own format: same header, same wording, same order", () => {
    const readme = readFileSync("README.md", "utf8");
    const start = readme.indexOf("| Check ");
    const published = readme.slice(start, readme.indexOf("\n\n", start)).split("\n");
    const printed = renderReadmeTable(chats).split("\n");
    const label = (line: string): string => line.split("|")[1].trim();

    expect(printed.slice(0, 2)).toEqual(published.slice(0, 2));
    const printedLabels = printed.slice(2).map(label);
    let from = 0;
    for (const line of published.slice(2)) {
      from = printedLabels.indexOf(label(line), from);
      expect(from, label(line)).toBeGreaterThan(-1);
    }
  });

  it("lists every model that answered and how many chats each answered", () => {
    const report = renderEvaluation({ model: "model-x", date: TODAY, chats });
    expect(report).toContain(
      "Answered by: model-x: 1, model-y (fallback when the first was busy): 1.",
    );
    expect(report).toContain("| Chat | Model | Client |");
  });

  it("puts the configured model first and counts a chat per model", () => {
    const answered = (id: string, model: string): EvaluatedChat => ({
      id,
      summary: "",
      score: scoreOf("01-logo-pack"),
      model,
    });
    const many = [answered("a", "fallback"), answered("b", "main"), answered("c", "fallback")];
    expect(renderModels("main", many)).toBe(
      "main: 1, fallback (fallback when the first was busy): 2",
    );
  });

  it("names no model when none answered, and leaves the line out of the report", () => {
    expect(renderModels("model-x", [chats[2]])).toBe("");
    const report = renderEvaluation({ model: "model-x", date: TODAY, chats: [chats[2]] });
    expect(report).not.toContain("Answered by");
  });

  it("says so when nothing differed", () => {
    const report = renderEvaluation({ model: "m", date: TODAY, chats: [chats[0]] });
    expect(report).toContain("Nothing differed.");
  });
});
