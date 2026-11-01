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
