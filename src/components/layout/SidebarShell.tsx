"use client";

import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

interface SidebarShellProps {
  brand: ReactNode;
  children: ReactNode;
}

// A side column from 768 px up. Below that it is a bar along the top with a menu button, and the
// menu closes when a link in it is followed.
export function SidebarShell({ brand, children }: SidebarShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="sticky top-0 z-30 flex flex-col bg-sidebar md:h-screen md:w-64 md:shrink-0 md:gap-6 md:overflow-y-auto md:p-5">
      <div className="flex items-center justify-between px-4 py-2 md:p-0">
        {brand}
        <div className="flex items-center md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-expanded={open}
            aria-controls="sidebar-panel"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
            className="flex size-11 items-center justify-center rounded-lg text-sidebar-foreground outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </button>
        </div>
      </div>
      <div
        id="sidebar-panel"
        role="presentation"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className={cn(
          "flex-col gap-6 px-4 pt-2 pb-4 md:flex md:flex-1 md:p-0",
          open ? "flex max-h-[calc(100dvh-4rem)] overflow-y-auto" : "hidden",
        )}
      >
        {children}
      </div>
    </aside>
  );
}
