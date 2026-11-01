"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleTheme } from "./theme";
import { useTheme } from "./use-theme";

const ICON =
  "absolute size-4 transition-all duration-[450ms] ease-out motion-reduce:transition-none";

// A moon in the light theme and a sun in the dark one, turning into each other as the theme changes.
export function ThemeToggle({ className }: { className?: string }) {
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
      className={cn(
        "relative flex size-9 items-center justify-center rounded-lg text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring max-md:size-11",
        className,
      )}
    >
      <Sun aria-hidden className={cn(ICON, dark ? "rotate-0 scale-100" : "-rotate-90 scale-0")} />
      <Moon aria-hidden className={cn(ICON, dark ? "rotate-90 scale-0" : "rotate-0 scale-100")} />
    </button>
  );
}
