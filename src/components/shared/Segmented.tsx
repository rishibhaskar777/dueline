"use client";

import { useRef, type ReactNode } from "react";
import { SlidingPill } from "@/components/layout/SlidingPill";
import { useSlidingIndicator } from "@/components/layout/use-sliding-indicator";
import { cn } from "@/lib/utils";
import { nextSegmentIndex } from "./segmented-keys";

interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  // Shown as a small badge after the label. An option with a count needs a text label, which the
  // button's accessible name is built from.
  count?: number;
  // Tints the badge as a warning while the count is above zero.
  alert?: boolean;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  // Names what the control chooses, e.g. "Filter invoices".
  label: string;
  // What the counts count, for the accessible name: "invoice" reads as "2 invoices".
  countNoun?: string;
  size?: "md" | "sm";
  disabled?: boolean;
}

const SIZES = {
  md: { item: "h-[42px] px-[19px] text-[15px] max-sm:px-2.5", pill: "h-[42px]" },
  sm: { item: "h-9 px-[15px] text-sm max-sm:px-2.5", pill: "h-9" },
} as const;

interface CountBadgeProps {
  count: number;
  // Whether the dark pill is under the item, which the badge must stay readable on.
  onPill: boolean;
  alert: boolean;
}

function CountBadge({ count, onPill, alert }: CountBadgeProps) {
  return (
    <>
      {/* A space in the text, as wide as nothing, so the visible text "Overdue 2" is part of the
          button's name. The margin sets the gap. */}
      <span className="text-[0px]"> </span>
      <span
        aria-hidden="true"
        className={cn(
          "ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 align-middle text-xs font-medium tabular-nums transition-colors duration-300 max-md:ml-[3px] max-md:h-4 max-md:min-w-4 max-md:px-[3px] max-md:text-[11px]",
          onPill
            ? "bg-white/20 text-white"
            : alert
              ? "bg-tint-red text-late"
              : "bg-hover text-muted-foreground",
        )}
      >
        {count}
      </span>
    </>
  );
}

// "Overdue, 2 invoices": the visible badge is hidden from assistive technology, so the button says
// the same thing in words.
function countedName(
  label: ReactNode,
  count: number,
  noun: string | undefined,
): string | undefined {
  if (typeof label !== "string") return undefined;
  if (!noun) return `${label}, ${count}`;
  return `${label}, ${count} ${count === 1 ? noun : `${noun}s`}`;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  countNoun,
  size = "md",
  disabled = false,
}: SegmentedProps<T>) {
  const activeIndex = options.findIndex((option) => option.value === value);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slider = useSlidingIndicator({
    containerRef,
    itemRefs,
    count: options.length,
    active: activeIndex >= 0 ? activeIndex : null,
  });

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={label}
      {...slider.containerProps}
      className="glass-track relative inline-flex max-w-full gap-0.5 overflow-x-auto overscroll-x-contain rounded-full p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <SlidingPill slider={slider} className={SIZES[size].pill} />
      {options.map((option, index) => {
        const item = slider.itemProps(index);
        return (
          <button
            key={option.value}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            aria-pressed={index === activeIndex}
            aria-label={
              option.count === undefined
                ? undefined
                : countedName(option.label, option.count, countNoun)
            }
            disabled={disabled}
            {...item}
            onClick={() => {
              item.onClick();
              onChange(option.value);
            }}
            onKeyDown={(event) => {
              const next = nextSegmentIndex(event.key, index, options.length);
              if (next === null) return;
              event.preventDefault();
              itemRefs.current[next]?.focus();
            }}
            className={cn(
              "relative z-10 rounded-full whitespace-nowrap disabled:opacity-60 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11",
              SIZES[size].item,
              "font-semibold",
              index === slider.highlighted ? "text-white" : "text-foreground",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <CountBadge
                count={option.count}
                onPill={index === slider.highlighted}
                alert={option.alert === true && option.count > 0}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
