"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useSlidingIndicator } from "@/components/layout/use-sliding-indicator";
import { Wordmark } from "@/components/layout/Wordmark";
import { cn } from "@/lib/utils";
import { DEMO_HREF, SITE_LINKS, activeSiteLink } from "./site-nav";
import { SitePill } from "./SitePill";

// The public site's top bar: the app bar's glass, with the four site pages as tabs. On the landing
// page no tab is current, so the pill only appears under the pointer.
export function SiteNav() {
  const active = activeSiteLink(usePathname());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const slider = useSlidingIndicator({
    containerRef,
    itemRefs,
    count: SITE_LINKS.length,
    active,
  });

  return (
    <header className="app-bar sticky top-0 z-40 text-foreground">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 md:flex-nowrap md:px-6">
        <Link
          href="/"
          className="flex min-h-11 flex-none items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Wordmark />
        </Link>
        <nav aria-label="Site" className="max-md:order-3 max-md:w-full md:flex-none">
          <div
            ref={containerRef}
            {...slider.containerProps}
            className="relative flex gap-1 rounded-full bg-hover p-1 [scrollbar-width:none] max-md:overflow-x-auto max-md:overscroll-x-contain [&::-webkit-scrollbar]:hidden"
          >
            <span
              aria-hidden="true"
              style={slider.indicatorStyle}
              className="glass-indicator pointer-events-none absolute top-1 left-0 h-11 rounded-full"
            />
            {SITE_LINKS.map((link, index) => (
              <Link
                key={link.href}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                href={link.href}
                aria-current={index === active ? "page" : undefined}
                {...slider.itemProps(index)}
                className={cn(
                  "relative z-10 flex h-11 shrink-0 items-center justify-center rounded-full px-[18px] text-[15px] whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  index === active ? "font-bold" : "font-semibold",
                  index === slider.highlighted ? "text-white" : "text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="ml-auto flex flex-none items-center gap-2 max-md:order-2">
          <ThemeToggle />
          <SitePill href={DEMO_HREF} variant="primary" small className="h-11 py-0">
            Open the demo
          </SitePill>
        </div>
      </div>
    </header>
  );
}
