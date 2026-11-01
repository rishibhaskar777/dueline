"use client";

import { Search } from "lucide-react";
import { OPEN_PALETTE_EVENT } from "./shortcuts";

export function PaletteButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      className="flex min-h-11 w-full md:min-h-9 items-center gap-3 rounded-lg border border-sidebar-border px-3 text-sm text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring md:min-h-9"
    >
      <Search aria-hidden className="size-4 shrink-0" />
      <span className="flex-1 text-left">Search</span>
      <kbd className="hidden text-xs opacity-80 md:inline">Ctrl K</kbd>
    </button>
  );
}
