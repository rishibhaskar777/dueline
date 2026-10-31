import { describe, expect, it } from "vitest";
import { cell, csvFile, csvLine } from "@/lib/export/csv-text";

describe("cell", () => {
  it("writes plain text and numbers as they are, and null as empty", () => {
    expect(cell("Brightwell Labs")).toBe("Brightwell Labs");
    expect(cell(1234.5)).toBe("1234.5");
    expect(cell(null)).toBe("");
  });

  it("puts a leading quote on text a spreadsheet would run as a formula", () => {
    for (const text of ["=SUM(A1)", "+1", "-1", "@cmd", "\tx", "\rx"]) {
      expect(cell(text).replace(/^"|"$/g, "")).toBe(`'${text}`);
    }
  });

  it("leaves a negative number alone, but not the same digits as text", () => {
    expect(cell(-5)).toBe("-5");
    expect(cell("-5")).toBe("'-5");
  });

  it("quotes text with a comma, quote or line break, and doubles inner quotes", () => {
    expect(cell("a,b")).toBe('"a,b"');
    expect(cell('say "hi"')).toBe('"say ""hi"""');
    expect(cell("a\nb")).toBe('"a\nb"');
  });
});

describe("csvLine and csvFile", () => {
  it("joins cells with commas", () => {
    expect(csvLine(["a", null, 3])).toBe("a,,3");
  });

  it("starts with a byte order mark and ends every line with CRLF", () => {
    expect(csvFile(["a,b", "c,d"])).toBe("﻿a,b\r\nc,d\r\n");
  });
});
