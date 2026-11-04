import type { FocusEvent, KeyboardEvent, MouseEvent } from "react";
import { formatMoney } from "@/lib/money/format";
import { cn } from "@/lib/utils";
import type { DueLineRow, LineTone } from "./due-line-layout";

// The client column, the line and the label; on a phone they stack, so the line keeps the full width.
export const ROW_COLUMNS =
  "grid grid-cols-[minmax(0,1fr)] md:grid-cols-[170px_minmax(0,1fr)_134px] md:gap-x-3.5";

const BAR: Record<LineTone, string> = {
  paid: "bg-mark-green",
  blue: "bg-blue-line",
  due_soon: "bg-mark-amber",
  late: "bg-mark-red",
};
const RING: Record<LineTone, string> = {
  paid: "border-mark-green",
  blue: "border-blue-line",
  due_soon: "border-mark-amber",
  late: "border-mark-red",
};
const STROKE: Record<LineTone, string> = {
  paid: "stroke-mark-green",
  blue: "stroke-blue-line",
  due_soon: "stroke-mark-amber",
  late: "stroke-mark-red",
};
const TEXT: Record<LineTone, string> = {
  paid: "text-paid",
  blue: "text-blue",
  due_soon: "text-due-soon",
  late: "text-late",
};

const percent = (fraction: number): string => `${fraction * 100}%`;

interface DueLineRowViewProps {
  row: DueLineRow;
  ticks: number[];
  today: number;
  onActivate: (row: DueLineRow, element: HTMLElement) => void;
  onShowTip: (row: DueLineRow, element: HTMLElement, pointerX: number | null) => void;
  onHideTip: () => void;
}

export function DueLineRowView({
  row,
  ticks,
  today,
  onActivate,
  onShowTip,
  onHideTip,
}: DueLineRowViewProps) {
  const { invoice, tone } = row;

  // The spaces between the parts make the row's text read as one phrase. Its accessible name begins
  // with the same words, which keeps the visible label part of the name.
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={row.accessibleName}
      onClick={(event: MouseEvent<HTMLElement>) => onActivate(row, event.currentTarget)}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onActivate(row, event.currentTarget);
      }}
      onMouseMove={(event: MouseEvent<HTMLElement>) =>
        onShowTip(row, event.currentTarget, event.clientX)
      }
      onMouseLeave={onHideTip}
      onFocus={(event: FocusEvent<HTMLElement>) => onShowTip(row, event.currentTarget, null)}
      onBlur={onHideTip}
      className={cn(
        ROW_COLUMNS,
        "cursor-pointer items-center gap-y-1 border-t border-bar-line py-3 outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="min-w-0 text-[15px] font-bold">
        <span className="block truncate">{invoice.client.name}</span>{" "}
        <span className="block truncate text-[13px] font-medium text-subtle tabular-nums">
          {invoice.number} · {formatMoney(invoice.amount)}
        </span>
      </span>{" "}
      <div data-line="" aria-hidden="true" className="relative h-[26px]">
        {ticks.map((position) => (
          <div
            key={position}
            className="absolute inset-y-0 w-px bg-grid-line"
            style={{ left: percent(position) }}
          />
        ))}
        <div className="absolute inset-x-0 top-3 h-0.5 rounded-sm bg-rail" />
        <div
          className="absolute -top-3 -bottom-3 border-l-2 border-dashed border-today-line"
          style={{ left: percent(today) }}
        />
        <div
          className={cn("dl-bar absolute top-[11px] h-1 rounded-sm", BAR[tone])}
          style={{ left: percent(row.from), width: percent(row.end - row.from) }}
        />
        {row.startsBeforeChart ? (
          <svg
            width="8"
            height="12"
            viewBox="0 0 8 12"
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("absolute top-[7px] left-0", STROKE[tone])}
          >
            <path d="M 6 1 L 1 6 L 6 11" />
          </svg>
        ) : (
          <span
            className={cn(
              "absolute top-[7px] -ml-1.5 box-border size-3 rounded-full border-[2.5px] bg-dot-ground",
              RING[tone],
            )}
            style={{ left: percent(row.from) }}
          />
        )}
        <span
          className="absolute top-[3px] -ml-px h-5 w-0.5 rounded-sm bg-foreground opacity-70"
          style={{ left: percent(row.due) }}
        />
        {row.promised !== null && (
          <span
            data-promised=""
            className="absolute top-[18px] -ml-[5px] size-2.5 rotate-45 rounded-[2px] border-2 border-blue-line bg-dot-ground"
            style={{ left: percent(row.promised) }}
          />
        )}
        <span
          className={cn(
            "absolute top-1.5 -ml-[7px] box-border size-3.5 rounded-full border-[2.5px] shadow-[0_0_0_4px_var(--dot-halo)]",
            RING[tone],
            row.endMark === "filled" ? BAR[tone] : "bg-dot-ground",
          )}
          style={{ left: percent(row.end) }}
        />
      </div>{" "}
      <span className={cn("text-sm font-bold", TEXT[tone])}>{row.statusText}</span>
    </div>
  );
}
