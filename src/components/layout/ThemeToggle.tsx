"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleTheme } from "./theme";
import { useTheme } from "./use-theme";

const ICON =
  "absolute size-5 transition-all duration-[450ms] ease-out motion-reduce:transition-none";

// A moon in the light theme and a sun in the dark one, turning into each other as the theme changes.
export function ThemeToggle() {
  const dark = useTheme() === "dark";

  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        toggleTheme({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
      }}
      className="bar-button relative w-11 text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Sun aria-hidden className={cn(ICON, dark ? "rotate-0 scale-100" : "-rotate-90 scale-0")} />
      <Moon aria-hidden className={cn(ICON, dark ? "rotate-90 scale-0" : "rotate-0 scale-100")} />
    </button>
  );
}
