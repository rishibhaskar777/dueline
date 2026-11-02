import { THEME_STORAGE_KEY, nextTheme, type Theme } from "./theme-model";

const CHANGING_CLASS = "theme-changing";

function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The choice then lasts until the page is closed.
  }
}

export function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

// Runs in the page before it is painted, so a dark screen never flashes white. It follows the same
// rule as `initialTheme` but must run before any module has loaded.
export const THEME_INIT_SCRIPT = `(function(){var t=null;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t})();`;

// The one way to change the theme, for the toggle button and the command palette. The change is
// instant: every transition is switched off for the frame in which the colours change, so cards,
// pills and the glass jump to the new theme instead of fading.
export function toggleTheme(): void {
  const root = document.documentElement;
  root.classList.add(CHANGING_CLASS);
  const next = nextTheme(currentTheme());
  applyTheme(next);
  writeStoredTheme(next);
  // Reading a layout property makes the browser apply the new colours while transitions are off.
  void root.offsetHeight;
  requestAnimationFrame(() => root.classList.remove(CHANGING_CLASS));
}
