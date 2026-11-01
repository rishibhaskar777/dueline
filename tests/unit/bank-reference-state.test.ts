import { describe, expect, it } from "vitest";
import {
  initialReference,
  reduceReference,
  shouldSave,
  type ReferenceAction,
} from "@/components/export/bank-reference-state";

function run(actions: ReferenceAction[], saved: string | null = null) {
  return actions.reduce(reduceReference, initialReference(saved));
}

describe("the bank reference box", () => {
  it("starts with what is saved", () => {
    expect(initialReference("FIRC/26-1")).toEqual({
      saved: "FIRC/26-1",
      typed: "FIRC/26-1",
      saving: false,
      error: null,
    });
    expect(initialReference(null).typed).toBe("");
  });

  it("types, saves on Enter and keeps what the server stored", () => {
    const typed = run([{ type: "type", text: " FIRC/26-2 " }]);
    expect(shouldSave(typed)).toBe(true);

    const saved = reduceReference(reduceReference(typed, { type: "saving" }), {
      type: "saved",
      stored: "FIRC/26-2",
    });
    expect(saved).toEqual({ saved: "FIRC/26-2", typed: "FIRC/26-2", saving: false, error: null });
    expect(shouldSave(saved)).toBe(false);
  });

  it("does not save an unchanged value, or one that is already being saved", () => {
    expect(shouldSave(initialReference("A1"))).toBe(false);
    const typed = run([{ type: "type", text: "B2" }, { type: "saving" }]);
    expect(shouldSave(typed)).toBe(false);
  });

  it("shows the error and keeps the bad text for the person to fix", () => {
    const failed = run([
      { type: "type", text: "bad number!" },
      { type: "saving" },
      { type: "failed", message: "Use letters, digits, / and - only, up to 40 characters." },
    ]);
    expect(failed.typed).toBe("bad number!");
    expect(failed.error).toBe("Use letters, digits, / and - only, up to 40 characters.");
    expect(failed.saving).toBe(false);
  });

  it("Escape after a failed save restores the last saved value and clears the error", () => {
    const restored = run(
      [
        { type: "type", text: "bad number!" },
        { type: "saving" },
        { type: "failed", message: "Use letters." },
        { type: "escape" },
      ],
      "FIRC/26-1",
    );
    expect(restored).toEqual({
      saved: "FIRC/26-1",
      typed: "FIRC/26-1",
      saving: false,
      error: null,
    });
  });

  it("Escape restores an empty box when nothing was ever saved", () => {
    expect(run([{ type: "type", text: "X1" }, { type: "escape" }]).typed).toBe("");
  });

  it("clears the box when the server answers that the reference is gone", () => {
    const cleared = run(
      [
        { type: "type", text: "" },
        { type: "saved", stored: null },
      ],
      "A1",
    );
    expect(cleared.saved).toBe("");
    expect(cleared.typed).toBe("");
  });
});
