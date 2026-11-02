"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDayMonth } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { InvoiceSummary } from "@/types";
import { DueLineRowView, ROW_COLUMNS } from "./DueLineRowView";
import { DueLineTooltip, type TooltipTarget } from "./DueLineTooltip";
import { DEFAULT_AXIS_PX, layoutDueLine } from "./due-line-layout";

interface DueLineChartProps {
  invoices: InvoiceSummary[];
  today: string;
  onOpen: (invoice: InvoiceSummary) => void;
}

const LEGEND = [
  { label: "Before due", className: "bg-blue-line" },
  { label: "Due soon", className: "bg-mark-amber" },
  { label: "Late", className: "bg-mark-red" },
  { label: "Paid", className: "bg-mark-green" },
];

export function DueLineChart({ invoices, today, onOpen }: DueLineChartProps) {
  const [showOlder, setShowOlder] = useState(false);
  const [tip, setTip] = useState<TooltipTarget | null>(null);
  const [axisPx, setAxisPx] = useState(DEFAULT_AXIS_PX);
  const axis = useRef<HTMLDivElement>(null);
  const layout = useMemo(
    () => layoutDueLine(invoices, today, showOlder, axisPx),
    [invoices, today, showOlder, axisPx],
  );
  const tickPositions = layout.ticks.map((tick) => tick.position);

  useEffect(() => {
    const element = axis.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setAxisPx(element.getBoundingClientRect().width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function showTip(row: TooltipTarget["row"], element: HTMLElement, pointerX: number | null): void {
    const rowRect = element.getBoundingClientRect();
    const lineRect = element.querySelector("[data-line]")?.getBoundingClientRect();
    const lineEnd = lineRect ? lineRect.left + row.end * lineRect.width : rowRect.left;
    setTip({ row, x: pointerX ?? lineEnd, rowTop: rowRect.top, rowBottom: rowRect.bottom });
  }

  return (
    <section
      aria-labelledby="due-line-title"
      className="surface flex flex-col gap-3.5 p-[26px] [--h2-size:26px] [--h2-tracking:-0.5px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 id="due-line-title">The due line</h2>
        <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-sm text-muted-foreground">
          {LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={cn("h-1 w-4 rounded-sm", item.className)} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div aria-hidden="true" className={cn(ROW_COLUMNS, "text-[13px] text-subtle")}>
        <span className="max-md:hidden" />
        <div ref={axis} className="relative h-[18px]">
          {layout.ticks
            .filter((tick) => tick.labelled)
            .map((tick) => (
              <span
                key={tick.date}
                className={cn(
                  "absolute top-0 whitespace-nowrap",
                  tick.position === 0 ? "" : "-translate-x-1/2",
                )}
                style={{ left: `${tick.position * 100}%` }}
              >
                {formatDayMonth(tick.date)}
              </span>
            ))}
          <span
            className="absolute top-0 -translate-x-1/2 font-semibold whitespace-nowrap text-foreground"
            style={{ left: `${layout.today * 100}%` }}
          >
            Today
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        {layout.rows.map((row) => (
          <DueLineRowView
            key={row.invoice.id}
            row={row}
            ticks={tickPositions}
            today={layout.today}
            onActivate={(selected) => onOpen(selected.invoice)}
            onShowTip={showTip}
            onHideTip={() => setTip(null)}
          />
        ))}
      </div>

      <span className="text-[13px] text-subtle">○ sent · | due date · ● paid or today</span>

      {layout.olderCount > 0 && (
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          aria-pressed={showOlder}
          onClick={() => setShowOlder((value) => !value)}
        >
          {showOlder ? "Hide older invoices" : `Show older (${layout.olderCount})`}
        </Button>
      )}
      {tip && <DueLineTooltip target={tip} />}
    </section>
  );
}
