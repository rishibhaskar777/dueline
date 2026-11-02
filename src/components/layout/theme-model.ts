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
