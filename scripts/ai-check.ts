import { generateText, Output, APICallError } from "ai";
import { z } from "zod";
import { getAiModels, modelCallFor, type AiModel } from "@/lib/ai/model";
import { reportFailure } from "./report-failure";

async function check({ id, model }: AiModel): Promise<boolean> {
  try {
    await generateText({
      ...modelCallFor({ id, model }),
      prompt: "Set ok to true.",
      output: Output.object({ schema: z.object({ ok: z.boolean() }) }),
    });
    console.log(`${id}: ok`);
    return true;
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown error";
    const status = APICallError.isInstance(error) ? ` (status ${error.statusCode ?? "none"})` : "";
    console.log(`${id}: ${name}${status}`);
    return false;
  }
}

async function main(): Promise<void> {
  const models = getAiModels();
  if (!models) {
    console.error("GEMINI_API_KEY is not set. Add it to .env.local.");
    process.exit(1);
  }

  const results = [await check(models.primary)];
  if (models.fallback) results.push(await check(models.fallback));
  else console.log("GEMINI_FALLBACK_MODEL is not set, so there is no fallback.");
  if (results.includes(false)) process.exit(1);
}

main().catch(reportFailure);
