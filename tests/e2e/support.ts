import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "offline";

type Theme = "light" | "dark";

export async function openInTheme(page: Page, theme: Theme, path: string): Promise<void> {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await page.goto(path);
  await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
}

// Serious and critical findings fail the test. The rest are attached to it, so the run lists them.
export async function expectNoSeriousViolations(page: Page, name: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();

  const describe = (violation: (typeof violations)[number]): string =>
    `${violation.impact}: ${violation.id} (${violation.nodes.length}): ${violation.help}\n` +
    violation.nodes.map((node) => `  ${node.target.join(" ")}: ${node.failureSummary}`).join("\n");

  const blocking = violations.filter(({ impact }) => impact === "serious" || impact === "critical");
  const minor = violations.filter(({ impact }) => impact !== "serious" && impact !== "critical");
  for (const violation of minor) {
    test.info().annotations.push({ type: `minor on ${name}`, description: describe(violation) });
  }
  expect(blocking.map(describe), name).toEqual([]);
}

// The sample chat asks for half upfront, which the form preselects. A test that needs one plain
// invoice turns it off first.
export async function turnUpfrontOff(page: Page): Promise<void> {
  await page
    .getByRole("group", { name: "Ask for part upfront" })
    .getByRole("button", { name: "Off" })
    .click();
}

// Linux runners draw text wider than Windows does. Forcing a wide face on everything lets a layout
// that only just fits here fail here too.
const WIDE_FONT_STYLE = '* { font-family: Verdana, "DejaVu Sans", sans-serif !important; }';

async function pageOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

// The page must not scroll sideways with its own font, nor with a much wider one.
export async function expectNoSidewaysScroll(page: Page, name = "The page"): Promise<void> {
  expect(await pageOverflow(page), `${name} scrolls sideways`).toBeLessThanOrEqual(0);
  const style = await page.addStyleTag({ content: WIDE_FONT_STYLE });
  try {
    await page.evaluate(() => document.fonts.ready);
    expect(
      await pageOverflow(page),
      `${name} scrolls sideways with a wider font`,
    ).toBeLessThanOrEqual(0);
  } finally {
    await style.evaluate((element) => (element as Element).remove());
  }
}
