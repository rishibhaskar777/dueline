import { describe, expect, it } from "vitest";
import { createDraftQueue } from "@/components/nudges/draft-queue";
import { improvedOutcome } from "@/components/nudges/nudge-model";

describe("improvedOutcome", () => {
  const drafted = { subject: "A quick reminder", message: "Hello, please pay. Thank you" };

  it("replaces the template while the user has not touched it", () => {
    expect(improvedOutcome(drafted, { ...drafted }, false)).toBe("apply");
  });

  it("keeps what the user typed, in the subject or in the message", () => {
    expect(improvedOutcome(drafted, { ...drafted, subject: "Hi" }, false)).toBe("keep-edits");
    expect(improvedOutcome(drafted, { ...drafted, message: `${drafted.message}!` }, false)).toBe(
      "keep-edits",
    );
  });

  it("changes nothing once the send has started", () => {
    expect(improvedOutcome(drafted, { ...drafted }, true)).toBe("ignore");
    expect(improvedOutcome(drafted, { ...drafted, subject: "Hi" }, true)).toBe("ignore");
  });
});

describe("createDraftQueue", () => {
  function job(log: string[], name: string, state: { running: number; most: number }) {
    return async () => {
      state.running += 1;
      state.most = Math.max(state.most, state.running);
      log.push(`start ${name}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      state.running -= 1;
      return name;
    };
  }

  it("runs at most two jobs at a time and finishes them all", async () => {
    const queue = createDraftQueue(2);
    const state = { running: 0, most: 0 };
    const log: string[] = [];

    const results = await Promise.all(
      ["a", "b", "c", "d", "e"].map((name) => queue.run(job(log, name, state))),
    );

    expect(results).toEqual(["a", "b", "c", "d", "e"]);
    expect(state.most).toBe(2);
    expect(log).toEqual(["start a", "start b", "start c", "start d", "start e"]);
  });

  it("keeps going after a job fails", async () => {
    const queue = createDraftQueue(1);
    const failing = queue.run(async () => {
      throw new Error("no draft");
    });
    const next = queue.run(async () => "ok");

    await expect(failing).rejects.toThrow("no draft");
    await expect(next).resolves.toBe("ok");
  });
});
