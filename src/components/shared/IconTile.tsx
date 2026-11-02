import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TileTone = "blue" | "amber" | "green" | "red";

const TONES: Record<TileTone, string> = {
  blue: "bg-tint-blue text-blue",
  amber: "bg-tint-amber text-due-soon",
  green: "bg-tint-green text-paid",
  red: "bg-tint-red text-late",
};

interface IconTileProps {
  tone: TileTone;
  children: ReactNode;
  // Size and radius; 56 px with an 18 px radius unless the caller says otherwise.
  className?: string;
}

// A tinted square that holds an icon or a short mark. Decorative: the text beside it says it all.
export function IconTile({ tone, children, className }: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-[18px]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
