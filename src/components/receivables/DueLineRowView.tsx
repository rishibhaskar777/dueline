import type { FocusEvent, KeyboardEvent, MouseEvent } from "react";
import { formatMoney } from "@/lib/money/format";
import type { DueLineRow, SegmentTone } from "./due-line-layout";

const ROW_HEIGHT = 44;
export const ROW_COLUMNS =
  "grid grid-cols-[11rem_minmax(28rem,1fr)_6.5rem] items-center max-md:grid-cols-[7.5rem_minmax(28rem,1fr)_6.5rem]";
const LINE_Y = ROW_HEIGHT / 2;
// Room the status text leaves after the end dot (radius and stroke) or the due tick, plus 6 px.
const AFTER_END_DOT_PX = 12;
const AFTER_DUE_TICK_PX = 7;

const STROKES: Record<SegmentTone, string> = {
  paid: "stroke-paid",
  blue: "stroke-blue",
  due_soon: "stroke-due-soon",
  late: "stroke-late",
};
const FILLS: Record<SegmentTone, string> = {
  paid: "fill-paid",
  blue: "fill-blue",
  due_soon: "fill-due-soon",
  late: "fill-late",
};
const STATUS_TEXT: Record<SegmentTone, string> = {
  paid: "fill-paid",
  blue: "fill-muted-foreground",
  due_soon: "fill-due-soon",
  late: "fill-late",
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
  const { invoice } = row;
  const onLeft = row.label.side === "left";

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
      className={`${ROW_COLUMNS} cursor-pointer rounded-md outline-none hover:bg-ground focus-visible:ring-2 focus-visible:ring-ring`}
      style={{ height: ROW_HEIGHT }}
    >
      <div className="min-w-0 pr-3 max-md:sticky max-md:left-0 max-md:z-10 max-md:bg-card">
        <p className="truncate text-sm font-medium">{invoice.client.name}</p>{" "}
        <p className="truncate text-sm text-muted-foreground tabular-nums">
          {invoice.number} · {formatMoney(invoice.amount)}
        </p>
      </div>{" "}
      <svg
        aria-hidden="true"
        width="100%"
        height={ROW_HEIGHT}
        className="due-line-grow overflow-visible"
      >
        {ticks.map((position) => (
          <line
            key={position}
            x1={percent(position)}
            x2={percent(position)}
            y1={0}
            y2={ROW_HEIGHT}
            className="stroke-line"
          />
        ))}
        <line
          x1={percent(today)}
          x2={percent(today)}
          y1={0}
          y2={ROW_HEIGHT}
          strokeDasharray="3 3"
          className="stroke-foreground"
        />
        {row.segments.map((segment) => (
          <line
            key={`${segment.from}-${segment.tone}`}
            x1={percent(segment.from)}
            x2={percent(segment.to)}
            y1={LINE_Y}
            y2={LINE_Y}
            strokeWidth={4}
            strokeLinecap="round"
            className={STROKES[segment.tone]}
          />
        ))}
        <line
          x1={percent(row.due)}
          x2={percent(row.due)}
          y1={LINE_Y - 9}
          y2={LINE_Y + 9}
          strokeWidth={2}
          className="stroke-foreground"
        />
        <circle
          cx={percent(row.end)}
          cy={LINE_Y}
          r={5}
          strokeWidth={2}
          className={`${row.endMark === "filled" ? FILLS[row.endTone] : "fill-card"} ${STROKES[row.endTone]}`}
        />
        {row.startsBeforeChart && (
          <path
            d={`M 8 ${LINE_Y - 5} L 2 ${LINE_Y} L 8 ${LINE_Y + 5}`}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={STROKES[row.segments[0].tone]}
          />
        )}
        <text
          x={percent(onLeft ? row.end : row.statusAt)}
          dx={
            onLeft ? -AFTER_END_DOT_PX : row.end >= row.due ? AFTER_END_DOT_PX : AFTER_DUE_TICK_PX
          }
          y={LINE_Y + 4 + row.label.dy}
          textAnchor={onLeft ? "end" : "start"}
          className={`${STATUS_TEXT[row.statusTone]} text-xs`}
        >
          {row.statusText}
        </text>
      </svg>
    </div>
  );
}
