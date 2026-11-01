import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as pause } from "node:timers/promises";
import {
  ExtractionFailedError,
  extractionRequest,
  extractInvoiceDraft,
} from "@/lib/ai/extract-invoice";
import { AiQuotaError, reserveDailyModelCall } from "@/lib/ai/quota";
import {
  expectedExtractionSchema,
  renderEvaluation,
  scoreExtraction,
  tally,
  type EvaluatedChat,
  type ExtractionOutcome,
} from "@/lib/ai/score-extraction";
import { today } from "@/lib/clock";
import { ConfigError, getEnv } from "@/lib/env";
import { maskContacts } from "@/lib/privacy/mask";
import { reportFailure } from "./report-failure";

const CHATS_DIR = "tests/fixtures/chats";
const REPORT_PATH = "docs/evaluation/extraction.md";
// Gemini's free tier allows a few requests a minute, so the chats are asked one after another.
const PAUSE_MS = 5_000;

async function chatIds(): Promise<string[]> {
  const entries = await readdir(CHATS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function evaluate(id: string, date: string): Promise<EvaluatedChat> {
  const chat = await readFile(join(CHATS_DIR, id, "chat.txt"), "utf8");
  const expected = expectedExtractionSchema.parse(
    JSON.parse(await readFile(join(CHATS_DIR, id, "expected.json"), "utf8")),
  );
  const { system, prompt } = extractionRequest(maskContacts(chat).masked, date);
  const sent = `${system}\n${prompt}`;

  let outcome: ExtractionOutcome;
  try {
    const { draft, warnings } = await extractInvoiceDraft(chat, {
      beforeModelCall: reserveDailyModelCall,
      fresh: true,
    });
    outcome = { draft, warnings, sent };
  } catch (error) {
    if (!(error instanceof ExtractionFailedError)) throw error;
    outcome = { draft: null, warnings: [], sent };
  }
  return { id, summary: expected.summary, score: scoreExtraction(expected, outcome, date) };
}

async function main(): Promise<void> {
  if (!getEnv().GEMINI_API_KEY) {
    throw new ConfigError(
      "Set GEMINI_API_KEY and GEMINI_MODEL in .env.local to run the evaluation.",
    );
  }

  const date = today();
  const chats: EvaluatedChat[] = [];
  let stopped: string | null = null;

  for (const id of await chatIds()) {
    if (stopped) {
      chats.push({ id, summary: "", error: stopped });
      continue;
    }
    try {
      chats.push(await evaluate(id, date));
      console.log(`Done: ${id}`);
    } catch (error) {
      if (!(error instanceof AiQuotaError)) throw error;
      stopped = `not run: ${error.message}`;
      chats.push({ id, summary: "", error: stopped });
    }
    await pause(PAUSE_MS);
  }

  const model = getEnv().GEMINI_MODEL ?? "unknown";
  await mkdir("docs/evaluation", { recursive: true });
  await writeFile(REPORT_PATH, `${renderEvaluation({ model, date, chats })}\n`);

  const totals = tally(chats.flatMap((chat) => ("score" in chat ? [chat.score] : [])));
  for (const [check, { passed, total }] of Object.entries(totals)) {
    console.log(`${check}: ${passed} of ${total}`);
  }
  console.log(`Report written to ${REPORT_PATH}`);
}

main().catch(reportFailure);
