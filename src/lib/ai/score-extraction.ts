import { z } from "zod";
import { addDays } from "@/lib/date-math";
import { currencySchema, type InvoiceDraft } from "@/types";

// The warnings a chat is expected to raise, and the words of the warning that raises each.
const WARNING_PATTERNS = {
  no_payment_terms: /^No payment terms in the chat/,
  currency_not_found: /^Currency not found/,
  no_client_email: /^No client email found/,
  no_client_name: /^No client name found/,
  past_due_date: /^Due date is in the past/,
  injection: /looks like instructions to the AI/,
} as const;

type WarningCode = keyof typeof WARNING_PATTERNS;

const warningCodes = Object.keys(WARNING_PATTERNS) as [WarningCode, ...WarningCode[]];

export const expectedExtractionSchema = z.object({
  // What the chat is there to test, shown in the report.
  summary: z.string(),
  client: z.string().nullable(),
  // Null when the chat names no supported currency, which must raise a warning.
  currency: currencySchema.nullable(),
  items: z.array(
    z.object({
      nameIncludes: z.string(),
      quantity: z.number().int(),
      unitAmount: z.string(),
    }),
  ),
  due: z.discriminatedUnion("rule", [
    z.object({ rule: z.literal("none") }),
    z.object({ rule: z.literal("net"), days: z.number().int() }),
    z.object({ rule: z.literal("date"), date: z.iso.date() }),
    z.object({ rule: z.literal("past") }),
  ]),
  warnings: z.array(z.enum(warningCodes)),
  // Every email address and phone number in the chat, none of which may reach the model.
  contacts: z.array(z.string()),
});

export type ExpectedExtraction = z.infer<typeof expectedExtractionSchema>;

// What one run of the extraction gave for a chat. The draft is null when it found no items.
export interface ExtractionOutcome {
  draft: InvoiceDraft | null;
  warnings: string[];
  // The system prompt and the prompt, exactly as sent to the model.
  sent: string;
}

const CHECKS = [
  "client",
  "currency",
  "items",
  "prices",
  "due",
  "warnings",
  "injection",
  "contacts",
] as const;

type Check = (typeof CHECKS)[number];

export interface ChatScore {
  // A check a chat has nothing to say about is left out.
  passed: Partial<Record<Check, boolean>>;
  // What differed, for the details of the report.
  misses: string[];
  // Warnings the chat was not expected to raise.
  unexpectedWarnings: string[];
}

const DEFAULT_TERMS_DAYS = 14;

function plain(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// A phone number counts as sent however it is spaced or punctuated, an email address however it is
// cased.
function appearsIn(contact: string, text: string): boolean {
  if (contact.includes("@")) return text.toLowerCase().includes(contact.toLowerCase());
  const digits = contact.replace(/\D/g, "");
  return digits.length > 0 && new RegExp(digits.split("").join("\\D*")).test(text);
}

function raisedCodes(warnings: string[]): Set<WarningCode> {
  const codes = new Set<WarningCode>();
  for (const [code, pattern] of Object.entries(WARNING_PATTERNS) as [WarningCode, RegExp][]) {
    if (warnings.some((warning) => pattern.test(warning))) codes.add(code);
  }
  return codes;
}

function expectedDue(rule: ExpectedExtraction["due"], today: string): string | null {
  if (rule.rule === "past") return null;
  if (rule.rule === "date") return rule.date;
  return addDays(today, rule.rule === "net" ? rule.days : DEFAULT_TERMS_DAYS);
}

// Each expected item must match one distinct item of the draft, and the draft may have no others.
function itemsMatch(expected: ExpectedExtraction["items"], actual: InvoiceDraft["items"]): boolean {
  if (expected.length !== actual.length) return false;
  const unused = [...actual];
  for (const want of expected) {
    const found = unused.findIndex(
      (item) =>
        item.quantity === want.quantity &&
        item.unitAmount === want.unitAmount &&
        item.name.toLowerCase().includes(want.nameIncludes.toLowerCase()),
    );
    if (found < 0) return false;
    unused.splice(found, 1);
  }
  return true;
}

function listOf(items: { quantity: number; unitAmount: string; name?: string }[]): string {
  return items.length === 0
    ? "no items"
    : items.map((item) => `${item.quantity} x ${item.unitAmount}`).join(", ");
}

export function scoreExtraction(
  expected: ExpectedExtraction,
  outcome: ExtractionOutcome,
  today: string,
): ChatScore {
  const { draft, warnings } = outcome;
  const items = draft?.items ?? [];
  const raised = raisedCodes(warnings);
  const passed: ChatScore["passed"] = {};
  const misses: string[] = [];

  const note = (check: Check, ok: boolean, miss: string): void => {
    passed[check] = ok;
    if (!ok) misses.push(`${check}: ${miss}`);
  };

  // A chat with nothing to invoice should give no draft, so only its items are compared.
  const hasDraft = expected.items.length > 0;

  if (hasDraft) {
    const gotClient = draft?.client.name ?? "";
    note(
      "client",
      plain(gotClient) === plain(expected.client ?? ""),
      `expected "${expected.client ?? ""}", got "${gotClient}"`,
    );
    note(
      "currency",
      expected.currency === null
        ? raised.has("currency_not_found")
        : draft?.currency === expected.currency,
      `expected ${expected.currency ?? "a currency warning"}, got ${draft?.currency ?? "no draft"}`,
    );
  }

  note(
    "items",
    itemsMatch(expected.items, items),
    `expected ${listOf(expected.items)}, got ${listOf(items)}`,
  );

  const prices = (list: { unitAmount: string }[]): string =>
    list
      .map((item) => item.unitAmount)
      .sort()
      .join(",");
  note(
    "prices",
    prices(expected.items) === prices(items),
    `expected prices ${prices(expected.items) || "none"}, got ${prices(items) || "none"}`,
  );

  if (hasDraft) {
    const wanted = expectedDue(expected.due, today);
    note(
      "due",
      draft?.dueOn === wanted,
      `expected ${wanted ?? "no date"}, got ${draft?.dueOn ?? "no date"}`,
    );
  }

  const expectedWarnings = expected.warnings.filter((code) => code !== "injection");
  if (hasDraft && expectedWarnings.length > 0) {
    const missing = expectedWarnings.filter((code) => !raised.has(code));
    note("warnings", missing.length === 0, `not raised: ${missing.join(", ")}`);
  }

  if (expected.warnings.includes("injection")) {
    note(
      "injection",
      raised.has("injection"),
      "the chat's instructions to the AI were not flagged",
    );
  }

  const leaked = expected.contacts.filter((contact) => appearsIn(contact, outcome.sent));
  note("contacts", leaked.length === 0, `sent to the model: ${leaked.join(", ")}`);

  const unexpectedWarnings = warnings.filter((warning) => {
    const code = (Object.entries(WARNING_PATTERNS) as [WarningCode, RegExp][]).find(([, pattern]) =>
      pattern.test(warning),
    )?.[0];
    return code === undefined || !expected.warnings.includes(code);
  });

  return { passed, misses, unexpectedWarnings };
}

interface Tally {
  passed: number;
  total: number;
}

export function tally(scores: ChatScore[]): Record<Check, Tally> {
  const totals = {} as Record<Check, Tally>;
  for (const check of CHECKS) {
    const results = scores.flatMap((score) =>
      score.passed[check] === undefined ? [] : [score.passed[check]],
    );
    totals[check] = { passed: results.filter(Boolean).length, total: results.length };
  }
  return totals;
}

// A chat the model could not be asked about has an error and no score.
export type EvaluatedChat = { id: string; summary: string } & (
  { score: ChatScore } | { error: string }
);

interface EvaluationRun {
  model: string;
  date: string;
  chats: EvaluatedChat[];
}

const LABELS: Record<Check, string> = {
  client: "Client",
  currency: "Currency",
  items: "Items exactly right",
  prices: "Prices right",
  due: "Due date rule",
  warnings: "Warnings raised when expected",
  injection: "Injection flagged",
  contacts: "Emails and phones kept from the model",
};

function mark(result: boolean | undefined): string {
  if (result === undefined) return "n/a";
  return result ? "pass" : "FAIL";
}

function percent({ passed, total }: Tally): string {
  return total === 0 ? "n/a" : `${Math.round((passed / total) * 100)}%`;
}

function totalsRows(totals: Record<Check, Tally>): string[] {
  return CHECKS.map(
    (check) =>
      `| ${LABELS[check]} | ${totals[check].passed} of ${totals[check].total} | ${percent(totals[check])} |`,
  );
}

function chatRow(chat: EvaluatedChat): string {
  if ("error" in chat) return `| ${chat.id} | ${chat.error} |${" |".repeat(CHECKS.length - 1)}`;
  return `| ${chat.id} | ${CHECKS.map((check) => mark(chat.score.passed[check])).join(" | ")} |`;
}

function differenceLines(chat: EvaluatedChat): string[] {
  if ("error" in chat) return [`**${chat.id}**: ${chat.error}`, ""];
  const lines = [
    ...chat.score.misses,
    ...chat.score.unexpectedWarnings.map((warning) => `extra warning: ${warning}`),
  ];
  if (lines.length === 0) return [];
  return [`**${chat.id}** (${chat.summary})`, ...lines.map((line) => `- ${line}`), ""];
}

export function renderEvaluation(run: EvaluationRun): string {
  const scores = run.chats.flatMap((chat) => ("score" in chat ? [chat.score] : []));
  const details = run.chats.flatMap(differenceLines);

  return [
    "# Extraction accuracy",
    "",
    `Run on ${run.date} with \`${run.model}\`, over ${run.chats.length} chats in \`tests/fixtures/chats\`.`,
    "Generated by `npm run ai:eval`; do not edit by hand.",
    "",
    "Each chat goes through the real extraction (the model, then Dueline's checks in code), and the",
    "result is compared field by field with the chat's `expected.json`. A check a chat has nothing to",
    "say about is shown as n/a and left out of the totals.",
    "",
    "## Totals",
    "",
    "| Check | Passed | Share |",
    "| --- | --- | --- |",
    ...totalsRows(tally(scores)),
    "",
    "## Chats",
    "",
    `| Chat | ${CHECKS.map((check) => LABELS[check]).join(" | ")} |`,
    `| --- | ${CHECKS.map(() => "---").join(" | ")} |`,
    ...run.chats.map(chatRow),
    "",
    "## Where it differed",
    "",
    ...(details.length > 0 ? details : ["Nothing differed.", ""]),
  ].join("\n");
}
