"use client";

import { Moon, Sun } from "lucide-react";
import { toggleTheme } from "./theme";
import { useTheme } from "./use-theme";

// A moon in the light theme and a sun in the dark one. The theme changes at once, with no motion.
export function ThemeToggle() {
  const dark = useTheme() === "dark";
  const Icon = dark ? Sun : Moon;

  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggleTheme}
      className="bar-button w-11 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
