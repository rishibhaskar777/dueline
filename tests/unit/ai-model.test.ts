import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiUnavailableError, getAiModels, runWithFallback } from "@/lib/ai/model";
import { apiCallError, noObjectError } from "../support/ai";
import { stubEnv } from "../support/env";

beforeEach(() => {
  stubEnv({
    GEMINI_API_KEY: "test-key",
    GEMINI_MODEL: "primary-model",
    GEMINI_FALLBACK_MODEL: "fallback-model",
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function modelIdOf(call: { model: unknown }): string {
  return (call.model as { modelId: string }).modelId;
}

describe("getAiModels", () => {
  it("is null without an API key", () => {
    stubEnv({ GEMINI_MODEL: "primary-model" });
    expect(getAiModels()).toBeNull();
  });

  it("reads both model ids from the environment", () => {
    const models = getAiModels();
    expect(models?.primary.id).toBe("primary-model");
    expect(models?.fallback?.id).toBe("fallback-model");
  });

  it("has no fallback when none is set", () => {
    stubEnv({ GEMINI_API_KEY: "test-key", GEMINI_MODEL: "primary-model" });
    expect(getAiModels()?.fallback).toBeNull();
  });

  it("names the missing model setting", () => {
    stubEnv({ GEMINI_API_KEY: "test-key" });
    expect(() => getAiModels()).toThrow("GEMINI_MODEL");
  });
});

describe("runWithFallback", () => {
  it("uses the primary model when it answers", async () => {
    const task = vi.fn(async (call: { model: unknown }) => modelIdOf(call));
    expect(await runWithFallback(task)).toBe("primary-model");
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("gives each call a timeout and turns the SDK's own retries off", async () => {
    await runWithFallback(async (call) => {
      expect(call.maxRetries).toBe(0);
      expect(call.abortSignal).toBeInstanceOf(AbortSignal);
    });
  });

  it("tries the fallback model after a 429", async () => {
    const task = vi
      .fn<(call: { model: unknown }) => Promise<string>>()
      .mockRejectedValueOnce(apiCallError(429))
      .mockImplementationOnce(async (call) => modelIdOf(call));
    expect(await runWithFallback(task)).toBe("fallback-model");
  });

  it("tries the fallback model after a timeout", async () => {
    const timeout = new DOMException("The operation timed out", "TimeoutError");
    const task = vi
      .fn<(call: { model: unknown }) => Promise<string>>()
      .mockRejectedValueOnce(timeout)
      .mockImplementationOnce(async (call) => modelIdOf(call));
    expect(await runWithFallback(task)).toBe("fallback-model");
  });

  it("tries the fallback model after a network failure", async () => {
    const task = vi
      .fn<(call: { model: unknown }) => Promise<string>>()
      .mockRejectedValueOnce(apiCallError())
      .mockImplementationOnce(async (call) => modelIdOf(call));
    expect(await runWithFallback(task)).toBe("fallback-model");
  });

  it("is unavailable when the primary fails with 500 and the fallback with 429", async () => {
    const task = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(apiCallError(500))
      .mockRejectedValueOnce(apiCallError(429));
    await expect(runWithFallback(task)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("does not try the fallback for an error it would fail on too", async () => {
    const task = vi.fn<() => Promise<string>>().mockRejectedValue(apiCallError(401));
    await expect(runWithFallback(task)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("does not retry an answer the schema rejected", async () => {
    const failure = noObjectError();
    const task = vi.fn<() => Promise<string>>().mockRejectedValue(failure);
    await expect(runWithFallback(task)).rejects.toBe(failure);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("is unavailable without an API key and calls nothing", async () => {
    stubEnv();
    const task = vi.fn<() => Promise<string>>();
    await expect(runWithFallback(task)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(task).not.toHaveBeenCalled();
  });

  it("logs only the model id, the error name and the status", async () => {
    const task = vi.fn<() => Promise<string>>().mockRejectedValue(apiCallError(500));
    await expect(runWithFallback(task)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(console.error).toHaveBeenCalledWith("AI call failed", {
      model: "primary-model",
      error: "AI_APICallError",
      status: 500,
    });
  });
});
