import { describe, expect, it } from "vitest";
import { nextSegmentIndex } from "@/components/shared/segmented-keys";

describe("nextSegmentIndex", () => {
  it("moves right and down to the next option", () => {
    expect(nextSegmentIndex("ArrowRight", 0, 4)).toBe(1);
    expect(nextSegmentIndex("ArrowDown", 2, 4)).toBe(3);
  });

  it("moves left and up to the previous option", () => {
    expect(nextSegmentIndex("ArrowLeft", 2, 4)).toBe(1);
    expect(nextSegmentIndex("ArrowUp", 1, 4)).toBe(0);
  });

  it("wraps around at both ends", () => {
    expect(nextSegmentIndex("ArrowRight", 3, 4)).toBe(0);
    expect(nextSegmentIndex("ArrowLeft", 0, 4)).toBe(3);
  });

  it("jumps to the first and last option with Home and End", () => {
    expect(nextSegmentIndex("Home", 2, 4)).toBe(0);
    expect(nextSegmentIndex("End", 1, 4)).toBe(3);
  });

  it("ignores other keys and an empty list", () => {
    expect(nextSegmentIndex("Enter", 1, 4)).toBeNull();
    expect(nextSegmentIndex("ArrowRight", 0, 0)).toBeNull();
  });
});
