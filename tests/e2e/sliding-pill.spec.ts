import { expect, test, type Locator, type Page } from "@playwright/test";
import { WIDE_FONT_STYLE, expectNoSidewaysScroll, openInTheme } from "./support";

type Theme = "light" | "dark";
type Motion = "no-preference" | "reduce";

const THEMES: Theme[] = ["light", "dark"];
const MOTIONS: Motion[] = ["no-preference", "reduce"];

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("The element is not on the page.");
  return box;
}

// Records, on every frame, how far the track's scrollable area runs past what it shows.
async function watchTrackOverflow(track: Locator): Promise<void> {
  await track.evaluate((element) => {
    const watched = window as unknown as { overflowSeen: number };
    watched.overflowSeen = 0;
    const sample = (): void => {
      const past = element.scrollWidth - element.clientWidth + element.scrollLeft;
      watched.overflowSeen = Math.max(watched.overflowSeen, past);
      requestAnimationFrame(sample);
    };
    sample();
  });
}

async function overflowSeen(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { overflowSeen: number }).overflowSeen);
}

// Hovers each item from the first to the last and back. The pill springs past the item it settles
// on, which must neither make the track scroll nor move anything around it.
async function hoverEveryItem(page: Page, track: Locator, items: Locator): Promise<void> {
  const heading = page.locator("#invoices-title");
  const search = page.getByRole("searchbox", { name: "Search invoices" });
  const count = await items.count();
  const forward = Array.from({ length: count }, (_, index) => index);
  const order = [...forward, ...forward.slice(0, -1).reverse()];
  // Hovering would scroll an item that is off screen, which moves every box on the page.
  await track.scrollIntoViewIfNeeded();
  const rest = {
    heading: await boxOf(heading),
    search: await boxOf(search),
    track: await boxOf(track),
  };
  const restingPageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await watchTrackOverflow(track);

  for (const index of order) {
    await items.nth(index).hover();
    await page.waitForTimeout(700);

    const [scrollLeft, scrollWidth, clientWidth] = await track.evaluate((element) => [
      element.scrollLeft,
      element.scrollWidth,
      element.clientWidth,
    ]);
    expect(scrollLeft, `scrollLeft over item ${index}`).toBe(0);
    expect(scrollWidth, `scrollWidth over item ${index}`).toBe(clientWidth);
    // The app scrolls inside its shell, so the page is as wide as the viewport less that scroll bar.
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth, `page width over item ${index}`).toBe(restingPageWidth);
    expect(await boxOf(heading), `heading over item ${index}`).toEqual(rest.heading);
    expect(await boxOf(search), `search box over item ${index}`).toEqual(rest.search);
    expect(await boxOf(track), `track over item ${index}`).toEqual(rest.track);
  }
  expect(await overflowSeen(page), "the track scrolled while the pill moved").toBeLessThanOrEqual(
    0,
  );
}

for (const theme of THEMES) {
  for (const motion of MOTIONS) {
    test.describe(`Sliding pill, ${theme} theme, motion ${motion}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await openInTheme(page, theme, "/receivables");
        await page.emulateMedia({ colorScheme: theme, reducedMotion: motion });
        await expect(page.getByRole("heading", { name: "The due line" })).toBeVisible();
        await page.waitForTimeout(600);
      });

      test("the status filter stays put while the pill moves over each item", async ({ page }) => {
        const track = page.getByRole("group", { name: "Filter by status" });
        await hoverEveryItem(page, track, track.getByRole("button"));
      });

      test("the app tabs stay put while the pill moves over each tab", async ({ page }) => {
        const nav = page.getByRole("navigation", { name: "Main" });
        await hoverEveryItem(page, nav.locator("> div"), nav.getByRole("link"));
      });
    });
  }
}

// Alpha-composites the layers behind the badge, bottom first, then measures its text against them.
async function badgeContrast(button: Locator, behindPill: boolean): Promise<number> {
  return button.evaluate((element, pillBehind) => {
    type Rgba = [number, number, number, number];
    const parse = (value: string): Rgba => {
      const match = /rgba?\(([^)]+)\)/.exec(value);
      const [r = 0, g = 0, b = 0, a = 1] = (match?.[1] ?? "0,0,0,0").split(/[ ,/]+/).map(Number);
      return [r, g, b, a];
    };
    const over = (top: Rgba, below: Rgba): Rgba => {
      const a = top[3] + below[3] * (1 - top[3]);
      const mix = (i: 0 | 1 | 2): number =>
        a === 0 ? 0 : (top[i] * top[3] + below[i] * below[3] * (1 - top[3])) / a;
      return [mix(0), mix(1), mix(2), a];
    };
    const luminance = ([r, g, b]: Rgba): number => {
      const linear = (c: number): number => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    };
    const badge = element.querySelector("[aria-hidden='true']");
    if (!badge) throw new Error("No badge in the button.");
    const layers: Rgba[] = [];
    for (let node: Element | null = badge.parentElement; node; node = node.parentElement) {
      layers.unshift(parse(getComputedStyle(node).backgroundColor));
    }
    if (pillBehind) {
      const pill = element.parentElement?.querySelector("span > span");
      if (pill) layers.push(parse(getComputedStyle(pill).backgroundColor));
    }
    layers.push(parse(getComputedStyle(badge).backgroundColor));
    const background = layers.reduce<Rgba>((below, top) => over(top, below), [255, 255, 255, 1]);
    const foreground = over(parse(getComputedStyle(badge).color), background);
    const [light = 0, dark = 0] = [luminance(foreground), luminance(background)].sort(
      (a, b) => b - a,
    );
    return (light + 0.05) / (dark + 0.05);
  }, behindPill);
}

for (const theme of THEMES) {
  test.describe(`Status filter counts, ${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await openInTheme(page, theme, "/receivables");
      await expect(page.getByRole("heading", { name: "The due line" })).toBeVisible();
    });

    test("each count is a badge and the button is named in words", async ({ page }) => {
      const filter = page.getByRole("group", { name: "Filter by status" });
      for (const name of ["All", "Overdue", "Due soon", "Paid"]) {
        const button = filter.getByRole("button", {
          name: new RegExp(`^${name}, \\d+ invoices?$`),
        });
        await expect(button).toHaveCount(1);
        await expect(button.getByText(/^\d+$/)).toBeVisible();
        // The visible text is "Overdue 2", which the accessible name contains.
        expect(await button.textContent()).toMatch(new RegExp(`^${name} \\d+$`));
      }
      const heights = await filter
        .getByRole("button")
        .evaluateAll((buttons) =>
          buttons.map(
            (button) =>
              button.querySelector("[aria-hidden='true']")?.getBoundingClientRect().height,
          ),
        );
      expect(new Set(heights).size, `badge heights ${heights.join(", ")}`).toBe(1);
    });

    test("badge text keeps 4.5:1 with and without the pill under it", async ({ page }) => {
      const buttons = page.getByRole("group", { name: "Filter by status" }).getByRole("button");
      const underPill = 1;
      await buttons.nth(underPill).hover();
      await page.waitForTimeout(400);
      for (let index = 0; index < 4; index++) {
        const ratio = await badgeContrast(buttons.nth(index), index === underPill);
        expect(ratio, `item ${index}, hovered`).toBeGreaterThanOrEqual(4.5);
      }
      await page.mouse.move(5, 5);
      await page.waitForTimeout(400);
      for (let index = 0; index < 4; index++) {
        const ratio = await badgeContrast(buttons.nth(index), index === 0);
        expect(ratio, `item ${index}, at rest`).toBeGreaterThanOrEqual(4.5);
      }
    });

    test("the four items fit at 360 px, in the page's own font and in a wider one", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      const track = page.getByRole("group", { name: "Filter by status" });
      await expect(track).toBeVisible();
      await expectNoSidewaysScroll(page);
      const overflow = (): Promise<number> =>
        track.evaluate((element) => element.scrollWidth - element.clientWidth);
      await expect.poll(overflow, { message: "in its own font" }).toBeLessThanOrEqual(0);
      const style = await page.addStyleTag({ content: WIDE_FONT_STYLE });
      await expect.poll(overflow, { message: "in a wider font" }).toBeLessThanOrEqual(0);
      await style.evaluate((element) => (element as Element).remove());
    });
  });
}
