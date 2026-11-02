"use client";

import { useRef } from "react";
import { useSlidingIndicator } from "@/components/layout/use-sliding-indicator";
import { cn } from "@/lib/utils";
import { nextSegmentIndex } from "./segmented-keys";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  // Names what the control chooses, e.g. "Filter invoices".
  label: string;
  size?: "md" | "sm";
}

const SIZES = {
  md: { item: "h-[42px] px-[19px] text-[15px]", pill: "h-[42px]" },
  sm: { item: "h-9 px-[15px] text-sm", pill: "h-9" },
} as const;

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
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
      className="glass-track relative inline-flex gap-0.5 rounded-full p-1"
    >
      <span
        aria-hidden="true"
        style={slider.indicatorStyle}
        className={cn(
          "glass-indicator pointer-events-none absolute top-1 left-0 rounded-full",
          SIZES[size].pill,
        )}
      />
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
              "relative z-10 rounded-full whitespace-nowrap transition-colors duration-300 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11",
              SIZES[size].item,
              index === activeIndex ? "font-bold" : "font-semibold",
              index === slider.highlighted ? "text-white" : "text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
