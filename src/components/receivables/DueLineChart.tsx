"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDayMonth } from "@/lib/format-date";
import type { InvoiceSummary } from "@/types";
import { DueLineRowView, ROW_COLUMNS } from "./DueLineRowView";
import { DueLineTooltip, type TooltipTarget } from "./DueLineTooltip";
import { DEFAULT_AXIS_PX, layoutDueLine, MAX_DUE_LINE_ROWS } from "./due-line-layout";

interface DueLineChartProps {
  invoices: InvoiceSummary[];
  today: string;
  onOpen: (invoice: InvoiceSummary) => void;
}

const LEGEND = [
  { label: "Paid", className: "bg-paid" },
  { label: "Before the due date", className: "bg-blue" },
  { label: "Due soon", className: "bg-due-soon" },
  { label: "Late", className: "bg-late" },
];

export function DueLineChart({ invoices, today, onOpen }: DueLineChartProps) {
  const [showAll, setShowAll] = useState(false);
  const [tip, setTip] = useState<TooltipTarget | null>(null);
  const [axisPx, setAxisPx] = useState(DEFAULT_AXIS_PX);
  const axis = useRef<SVGSVGElement>(null);
  const layout = useMemo(
    () => layoutDueLine(invoices, today, showAll, axisPx),
    [invoices, today, showAll, axisPx],
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
    const lineRect = element.querySelector("svg")?.getBoundingClientRect();
    const lineEnd = lineRect ? lineRect.left + row.end * lineRect.width : rowRect.left;
    setTip({ row, x: pointerX ?? lineEnd, rowTop: rowRect.top, rowBottom: rowRect.bottom });
  }

  return (
    <section
      aria-labelledby="due-line-title"
      className="rounded-xl border border-line bg-white p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="due-line-title" className="text-xl font-semibold">
          The due line
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-1 w-4 rounded-full ${item.className}`} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[46rem]">
          <div className={`${ROW_COLUMNS} h-6`}>
            <svg
              ref={axis}
              aria-hidden="true"
              width="100%"
              height={24}
              className="col-start-2 overflow-visible"
            >
              {layout.ticks.map((tick) => (
                <text
                  key={tick.date}
                  x={`${tick.position * 100}%`}
                  y={16}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {formatDayMonth(tick.date)}
                </text>
              ))}
              <text
                x={`${layout.today * 100}%`}
                y={6}
                textAnchor="middle"
                className="fill-navy text-[11px] font-semibold"
              >
                Today
              </text>
            </svg>
          </div>
          <div>
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
        </div>
      </div>

      {layout.total > MAX_DUE_LINE_ROWS && (
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "Show fewer invoices" : `Show all ${layout.total} invoices`}
        </Button>
      )}
      {tip && <DueLineTooltip target={tip} />}
    </section>
  );
}
