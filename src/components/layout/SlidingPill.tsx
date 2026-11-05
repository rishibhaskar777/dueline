import { cn } from "@/lib/utils";
import type { SlidingIndicator } from "./use-sliding-indicator";

interface SlidingPillProps {
  slider: Pick<SlidingIndicator, "clipStyle" | "indicatorStyle">;
  // The pill's height, which is the item's.
  className: string;
}

// The pill that slides under the hovered or chosen item. It sits in a clip box as wide as the items,
// so the spring's overshoot is cut off at the track's edge instead of making the track scroll.
export function SlidingPill({ slider, className }: SlidingPillProps) {
  return (
    <span
      aria-hidden="true"
      style={slider.clipStyle}
      className="pointer-events-none absolute top-0 left-0 h-full overflow-hidden rounded-full"
    >
      <span
        style={slider.indicatorStyle}
        className={cn("glass-indicator absolute top-1 left-0 rounded-full", className)}
      />
    </span>
  );
}
