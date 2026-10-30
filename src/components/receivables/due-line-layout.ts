import { addDays, daysBetween } from "@/lib/date-math";
import { formatDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/money/format";
import type { InvoiceSummary } from "@/types";

export const MAX_DUE_LINE_ROWS = 12;
const AXIS_PADDING_DAYS = 3;
const TICK_EVERY_DAYS = 7;
export const MIN_LINE_PX = 8;
// The chart column is never narrower than this (see ROW_COLUMNS), so it is the safe width to assume
// before the real one is measured.
export const DEFAULT_AXIS_PX = 448;

export type SegmentTone = "paid" | "blue" | "due_soon" | "late";

interface Segment {
  from: number;
  to: number;
  tone: SegmentTone;
}

export interface DueLineRow {
  invoice: InvoiceSummary;
  segments: Segment[];
  due: number;
  end: number;
  endMark: "filled" | "open";
  endTone: SegmentTone;
  statusTone: SegmentTone;
  statusText: string;
  accessibleName: string;
}

interface Tick {
  position: number;
  date: string;
}

// Positions are fractions of the axis (0 to 1), so the chart can scale them to any width.
export interface DueLineLayout {
  today: number;
  ticks: Tick[];
  rows: DueLineRow[];
  total: number;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function newestFirst(a: InvoiceSummary, b: InvoiceSummary): number {
  return b.issuedOn.localeCompare(a.issuedOn) || b.number.localeCompare(a.number);
}

function statusText(invoice: InvoiceSummary, today: string): string {
  if (invoice.dueState === "paid") return "Paid";
  const untilDue = daysBetween(today, invoice.dueOn);
  if (untilDue > 0) return `Due in ${plural(untilDue, "day")}`;
  if (untilDue === 0) return "Due today";
  return `${plural(-untilDue, "day")} late`;
}

function accessibleName(invoice: InvoiceSummary, status: string): string {
  const when =
    invoice.dueState === "paid" && invoice.paidOn
      ? `paid ${formatDate(invoice.paidOn)}`
      : `due ${formatDate(invoice.dueOn)}, ${status.toLowerCase()}`;
  return `${invoice.client.name}, ${formatMoney(invoice.amount)}, ${when}`;
}

function paidSegments(from: number, due: number, paidOn: number): Segment[] {
  if (paidOn <= due) return [{ from, to: paidOn, tone: "paid" }];
  return [
    { from, to: due, tone: "paid" },
    { from: due, to: paidOn, tone: "late" },
  ];
}

function unpaidSegments(
  invoice: InvoiceSummary,
  from: number,
  due: number,
  now: number,
): Segment[] {
  if (invoice.dueState === "overdue" && now > due) {
    return [
      { from, to: due, tone: "blue" },
      { from: due, to: now, tone: "late" },
    ];
  }
  const tone = invoice.dueState === "due_soon" ? "due_soon" : "blue";
  return [{ from, to: now, tone }];
}

function buildRow(
  invoice: InvoiceSummary,
  today: string,
  origin: string,
  span: number,
  axisPx: number,
): DueLineRow {
  const at = (date: string): number => daysBetween(origin, date) / span;
  const from = at(invoice.issuedOn);
  const due = at(invoice.dueOn);
  const paid = invoice.dueState === "paid";
  // An unpaid line never shrinks to a dot: it is at least MIN_LINE_PX long on screen.
  const finish = paid
    ? at(invoice.paidOn ?? invoice.dueOn)
    : Math.max(at(today), from + MIN_LINE_PX / axisPx);
  const segments = paid
    ? paidSegments(from, due, finish)
    : unpaidSegments(invoice, from, due, finish);
  const status = statusText(invoice, today);
  const endTone = segments[segments.length - 1].tone;

  return {
    invoice,
    segments,
    due,
    end: finish,
    endMark: paid ? "filled" : "open",
    endTone,
    statusTone: paid ? "paid" : endTone,
    statusText: status,
    accessibleName: accessibleName(invoice, status),
  };
}

export function layoutDueLine(
  invoices: InvoiceSummary[],
  today: string,
  showAll: boolean,
  axisPx: number = DEFAULT_AXIS_PX,
): DueLineLayout {
  const sorted = [...invoices].sort(newestFirst);
  const shown = showAll ? sorted : sorted.slice(0, MAX_DUE_LINE_ROWS);
  if (shown.length === 0) return { today: 0, ticks: [], rows: [], total: 0 };

  const dates = shown.flatMap((invoice) => [
    invoice.issuedOn,
    invoice.dueOn,
    ...(invoice.paidOn ? [invoice.paidOn] : []),
  ]);
  const origin = [today, ...dates].reduce((a, b) => (b < a ? b : a));
  const latest = [today, ...dates].reduce((a, b) => (b > a ? b : a));
  const lastDay = addDays(latest, AXIS_PADDING_DAYS);
  const span = Math.max(1, daysBetween(origin, lastDay));

  const ticks: Tick[] = [];
  for (let day = 0; day <= span; day += TICK_EVERY_DAYS) {
    ticks.push({ position: day / span, date: addDays(origin, day) });
  }

  return {
    today: daysBetween(origin, today) / span,
    ticks,
    rows: shown.map((invoice) => buildRow(invoice, today, origin, span, axisPx)),
    total: sorted.length,
  };
}
