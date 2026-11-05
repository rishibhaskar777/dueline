"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { NAV_TABS, activeTabIndex } from "./nav-tabs";
import { SlidingPill } from "./SlidingPill";
import { useNudgesCount } from "./use-nudges-count";
import { useSlidingIndicator } from "./use-sliding-indicator";

const NUDGES = NAV_TABS.findIndex((tab) => tab.href === "/nudges");

// The five main pages as tabs on a tinted track. On a phone the track scrolls sideways inside itself and
// brings the current tab into view.
export function MainTabs() {
  const pathname = usePathname();
  const active = activeTabIndex(pathname);
  const overdue = useNudgesCount();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const slider = useSlidingIndicator({
    containerRef,
    itemRefs,
    count: NAV_TABS.length,
    active,
    resetKey: pathname,
  });

  useEffect(() => {
    const track = containerRef.current;
    const tab = active === null ? null : itemRefs.current[active];
    if (!track || !tab || track.scrollWidth <= track.clientWidth) return;
    track.scrollLeft = tab.offsetLeft - (track.clientWidth - tab.offsetWidth) / 2;
  }, [active]);

  return (
    <nav aria-label="Main" className="min-h-[52px] min-w-0">
      <div
        ref={containerRef}
        {...slider.containerProps}
        className="relative flex snap-x snap-mandatory gap-1 rounded-full bg-hover p-1 [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
      >
        <SlidingPill slider={slider} className="h-11" />
        {NAV_TABS.map((tab, index) => {
          const count = index === NUDGES ? overdue : 0;
          return (
            <Link
              key={tab.href}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              href={tab.href}
              aria-current={index === active ? "page" : undefined}
              aria-label={count > 0 ? `${tab.label}, ${count} overdue` : undefined}
              {...slider.itemProps(index)}
              className={cn(
                "relative z-10 flex h-11 shrink-0 snap-start items-center justify-center rounded-full px-[18px] text-[15px] whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-lg:md:px-3",
                "font-semibold",
                index === slider.highlighted ? "text-white" : "text-foreground",
              )}
            >
              {tab.label}
              {count > 0 && (
                // The no-break space keeps the visible text "Nudges 2", which the accessible name
                // contains.
                <span className="inline-flex items-center">
                  {" "}
                  <span className="ml-1 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-pill-red px-1.5 text-xs font-bold text-pill-red-text">
                    {count}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
