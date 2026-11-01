function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const digits = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((start) => channel(parseInt(digits.slice(start, start + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio of two #rrggbb colours, from 1 to 21.
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

// The custom properties declared in one block of a stylesheet, with `var(--other)` followed to the
// colour it names.
export function readTokens(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No ${selector} block in the stylesheet`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  );
}

export function resolveToken(name: string, ...layers: Record<string, string>[]): string {
  for (let depth = 0; depth < 5; depth++) {
    const value = layers.map((layer) => layer[name]).find((found) => found !== undefined);
    if (value === undefined) throw new Error(`Token --${name} is not defined`);
    const reference = /^var\(--([\w-]+)\)$/.exec(value);
    if (!reference) return value;
    name = reference[1];
  }
  throw new Error("Tokens refer to each other in a loop");
}
