import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Segmented } from "@/components/shared/Segmented";

type Option = Parameters<typeof Segmented<string>>[0]["options"][number];

function render(options: Option[], countNoun?: string): string {
  return renderToStaticMarkup(
    createElement(Segmented<string>, {
      label: "Filter by status",
      options,
      value: "all",
      onChange: () => undefined,
      countNoun,
    }),
  );
}

describe("Segmented counts", () => {
  it("shows a count as a badge that assistive technology skips", () => {
    const html = render([{ value: "overdue", label: "Overdue", count: 2 }], "invoice");
    expect(html).toMatch(/<span aria-hidden="true" class="[^"]*rounded-full[^"]*">2<\/span>/);
  });

  it("names the button with the label, the count and the noun", () => {
    const html = render(
      [
        { value: "overdue", label: "Overdue", count: 2 },
        { value: "due_soon", label: "Due soon", count: 1 },
        { value: "none", label: "Paid", count: 0 },
      ],
      "invoice",
    );
    expect(html).toContain('aria-label="Overdue, 2 invoices"');
    expect(html).toContain('aria-label="Due soon, 1 invoice"');
    expect(html).toContain('aria-label="Paid, 0 invoices"');
  });

  it("names the button with the count alone when no noun is given", () => {
    expect(render([{ value: "a", label: "Open", count: 3 }])).toContain('aria-label="Open, 3"');
  });

  it("draws no badge and sets no name for an option without a count", () => {
    const html = render([{ value: "all", label: "All" }]);
    expect(html).not.toContain('aria-label="All');
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(1);
  });

  it("tints the badge only for an alert option with something to alert about", () => {
    const tinted = (option: Option): boolean => render([option]).includes("bg-tint-red");
    expect(tinted({ value: "overdue", label: "Overdue", count: 2, alert: true })).toBe(true);
    expect(tinted({ value: "overdue", label: "Overdue", count: 0, alert: true })).toBe(false);
    expect(tinted({ value: "paid", label: "Paid", count: 5 })).toBe(false);
  });

  it("gives every item the same weight, so choosing one does not resize the track", () => {
    const html = render([
      { value: "all", label: "All", count: 1 },
      { value: "paid", label: "Paid", count: 1 },
    ]);
    expect(html).not.toContain("font-bold");
  });
});
