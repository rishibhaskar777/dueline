import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A figure card for a <dl>: Home's totals and a client's totals.
interface TotalCardProps {
  label: string;
  value: string;
  note: ReactNode;
  tone?: "late" | "navy";
}

export function TotalCard({ label, value, note, tone }: TotalCardProps) {
  const navy = tone === "navy";
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-[24px] p-[26px] transition-transform duration-[350ms] ease-spring hover:-translate-y-[3px] motion-reduce:transition-none motion-reduce:hover:transform-none",
        navy ? "bg-navy-card text-white" : "surface",
      )}
    >
      <dt
        className={cn(
          "text-base font-semibold",
          navy ? "text-navy-card-muted" : "text-muted-foreground",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "font-heading text-[46px] leading-[1.15] font-extrabold tracking-[-1px] tabular-nums",
          tone === "late" && "text-late",
        )}
      >
        {value}
      </dd>
      <dd className={cn("text-[15px]", navy ? "text-navy-card-muted" : "text-subtle")}>{note}</dd>
    </div>
  );
}
