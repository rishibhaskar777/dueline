import { THEME_STORAGE_KEY, nextTheme, revealRadius, type Theme } from "./theme-model";

const REVEAL_MS = 450;

export interface Point {
  x: number;
  y: number;
}

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

function reveal(origin: Point): void {
  const radius = revealRadius(origin.x, origin.y, window.innerWidth, window.innerHeight);
  const at = `${origin.x}px ${origin.y}px`;
  document.documentElement.animate(
    { clipPath: [`circle(0px at ${at})`, `circle(${radius}px at ${at})`] },
    { duration: REVEAL_MS, easing: "ease-out", pseudoElement: "::view-transition-new(root)" },
  );
}

// The one way to change the theme, for the toggle button and the command palette. The new theme
// grows as a circle from `origin`, unless the browser cannot do that or the user asked for less
// motion.
export function toggleTheme(origin?: Point): void {
  const next = nextTheme(currentTheme());
  const change = (): void => {
    applyTheme(next);
    writeStoredTheme(next);
  };
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (calm || typeof document.startViewTransition !== "function") {
    change();
    return;
  }
  const transition = document.startViewTransition(change);
  const from = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  void transition.ready.then(
    () => reveal(from),
    () => {},
  );
}
