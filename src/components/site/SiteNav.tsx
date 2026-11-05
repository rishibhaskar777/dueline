"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { SlidingPill } from "@/components/layout/SlidingPill";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useSlidingIndicator } from "@/components/layout/use-sliding-indicator";
import { Wordmark } from "@/components/layout/Wordmark";
import { cn } from "@/lib/utils";
import { DEMO_HREF, SITE_LINKS, activeSiteLink } from "./site-nav";
import { SitePill } from "./SitePill";

// The public site's top bar: the app bar's glass, with the four site pages as tabs. On the landing
// page no tab is current, so the pill only appears under the pointer.
export function SiteNav() {
  const pathname = usePathname();
  const active = activeSiteLink(pathname);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const slider = useSlidingIndicator({
    containerRef,
    itemRefs,
    count: SITE_LINKS.length,
    active,
    resetKey: pathname,
  });

  return (
    <header className="app-bar sticky top-0 z-40 text-foreground">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 lg:flex-nowrap lg:px-6">
        <Link
          href="/"
          className="flex min-h-11 flex-none items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Wordmark />
        </Link>
        <nav aria-label="Site" className="max-lg:order-3 max-lg:w-full lg:flex-none">
          <div
            ref={containerRef}
            {...slider.containerProps}
            className="relative flex gap-1 rounded-full bg-hover p-1 [scrollbar-width:none] max-lg:overflow-x-auto max-lg:overscroll-x-contain [&::-webkit-scrollbar]:hidden"
          >
            <SlidingPill slider={slider} className="h-11" />
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
                  "font-semibold",
                  index === slider.highlighted ? "text-white" : "text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="ml-auto flex flex-none items-center gap-2 max-lg:order-2">
          <ThemeToggle />
          <SitePill href={DEMO_HREF} variant="primary" small className="h-11 py-0">
            Open the demo
          </SitePill>
        </div>
      </div>
    </header>
  );
}
