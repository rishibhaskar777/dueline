import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: ReactNode;
  note: string;
  tone?: "late" | "due-soon";
  compact?: boolean;
}

export function StatTile({ label, value, note, tone, compact = false }: StatTileProps) {
  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn("mt-1 font-heading font-semibold text-navy tabular-nums", {
          "text-4xl": !compact,
          "text-2xl": compact,
          "text-late": tone === "late",
          "text-due-soon": tone === "due-soon",
        })}
      >
        {value}
      </dd>
      <dd className="mt-1 text-sm text-muted-foreground">{note}</dd>
    </div>
  );
}
