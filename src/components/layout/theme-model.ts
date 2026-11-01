export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "dueline.theme";

// The stored choice wins; with nothing stored (or anything unexpected) the device's setting decides.
export function initialTheme(stored: string | null, systemPrefersDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark ? "dark" : "light";
}

export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

// The circle has to reach the corner farthest from where it starts, or the new theme would stop
// short of covering the screen.
export function revealRadius(x: number, y: number, width: number, height: number): number {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
}
