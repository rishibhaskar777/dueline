import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { APICallError, type LanguageModel } from "ai";
import { ConfigError, getEnv } from "@/lib/env";

const CALL_TIMEOUT_MS = 20_000;

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export interface AiModel {
  id: string;
  model: LanguageModel;
}

interface AiModels {
  primary: AiModel;
  fallback: AiModel | null;
}

// Spread into generateText. We decide when to retry, so the SDK never does.
interface ModelCall {
  model: LanguageModel;
  abortSignal: AbortSignal;
  maxRetries: 0;
}

export function getAiModels(): AiModels | null {
  const { GEMINI_API_KEY, GEMINI_MODEL, GEMINI_FALLBACK_MODEL } = getEnv();
  if (!GEMINI_API_KEY) return null;
  if (!GEMINI_MODEL) throw new ConfigError("Missing or invalid settings: GEMINI_MODEL.");

  const provider = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });
  const named = (id: string): AiModel => ({ id, model: provider(id) });
  return {
    primary: named(GEMINI_MODEL),
    fallback: GEMINI_FALLBACK_MODEL ? named(GEMINI_FALLBACK_MODEL) : null,
  };
}

export function modelCallFor({ model }: AiModel): ModelCall {
  return { model, abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS), maxRetries: 0 };
}

function isTimeoutOrNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    (error.name === "TypeError" && error.message === "fetch failed")
  );
}

function statusOf(error: unknown): number | undefined {
  return APICallError.isInstance(error) ? error.statusCode : undefined;
}

// A quota or rate limit (429), a server error or a request that never got an answer can work on
// the other model. Anything else the provider rejected (a bad key, a bad request) would fail there too.
function worthTryingElsewhere(error: unknown): boolean {
  if (isTimeoutOrNetworkFailure(error)) return true;
  if (!APICallError.isInstance(error)) return false;
  const status = statusOf(error);
  return status === undefined || status === 429 || status >= 500;
}

function isProviderFailure(error: unknown): boolean {
  return APICallError.isInstance(error) || isTimeoutOrNetworkFailure(error);
}

// Only the model id, the error name and the status are logged: errors can carry the prompt.
function logFailure(modelId: string, error: unknown): void {
  console.error("AI call failed", {
    model: modelId,
    error: error instanceof Error ? error.name : "unknown",
    status: statusOf(error) ?? null,
  });
}

export async function runWithFallback<T>(task: (call: ModelCall) => Promise<T>): Promise<T> {
  const models = getAiModels();
  if (!models) throw new AiUnavailableError("GEMINI_API_KEY is not set.");

  const candidates = models.fallback ? [models.primary, models.fallback] : [models.primary];
  for (const [index, candidate] of candidates.entries()) {
    try {
      return await task(modelCallFor(candidate));
    } catch (error) {
      // Anything that is not a provider failure, such as NoObjectGeneratedError, is not retried.
      if (!isProviderFailure(error)) throw error;
      logFailure(candidate.id, error);
      const isLast = index === candidates.length - 1;
      if (isLast || !worthTryingElsewhere(error)) break;
    }
  }
  throw new AiUnavailableError("The AI models did not answer.");
}
