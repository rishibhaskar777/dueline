"use client";

import { Search } from "lucide-react";
import { OPEN_PALETTE_EVENT } from "./shortcuts";

// A pill with the shortcut from 1024 px up; a round icon button below that, where the bar is tight.
export function PaletteButton() {
  return (
    <button
      type="button"
      aria-keyshortcuts="Control+K"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      className="bar-button w-11 gap-2 text-[15px] font-semibold text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:w-auto lg:px-3.5"
    >
      <Search aria-hidden className="size-[18px] shrink-0 lg:size-4" strokeWidth={2.2} />
      <span className="max-lg:sr-only">Search</span>
      <kbd className="rounded-md bg-kbd px-1.5 py-0.5 font-sans text-xs text-muted-foreground max-lg:hidden">
        Ctrl K
      </kbd>
    </button>
  );
}
