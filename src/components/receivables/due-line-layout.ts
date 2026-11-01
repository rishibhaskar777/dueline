import { addDays, daysBetween } from "@/lib/date-math";
import { formatDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/money/format";
import type { InvoiceSummary } from "@/types";

// The default view covers this many days back and ahead of today; older invoices are one click away.
export const HISTORY_DAYS = 60;
export const AHEAD_DAYS = 21;
const AXIS_PADDING_DAYS = 3;
const TICK_EVERY_DAYS = 7;
export const MIN_LINE_PX = 8;
// A week label this close to the "Today" label would overlap it.
export const TODAY_LABEL_CLEARANCE_PX = 24;
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
  // Where the status text starts: after whichever is further right, the line's end or its due tick.
  statusAt: number;
  // Another row in the chart has the same client name, so the invoice number tells them apart.
  sharesClientName: boolean;
  endMark: "filled" | "open";
  endTone: SegmentTone;
  statusTone: SegmentTone;
  statusText: string;
  accessibleName: string;
}

interface Tick {
  position: number;
  date: string;
  // False when the label would run into the "Today" label.
  labelled: boolean;
}

// Positions are fractions of the axis (0 to 1), so the chart can scale them to any width.
export interface DueLineLayout {
  today: number;
  ticks: Tick[];
  rows: DueLineRow[];
  // Invoices the default view leaves out because they ended before it starts.
  olderCount: number;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function newestFirst(a: InvoiceSummary, b: InvoiceSummary): number {
  return b.issuedOn.localeCompare(a.issuedOn) || b.number.localeCompare(a.number);
}

function lateDays(invoice: InvoiceSummary): number {
  return invoice.paidOn ? Math.max(0, daysBetween(invoice.dueOn, invoice.paidOn)) : 0;
}

function statusText(invoice: InvoiceSummary, today: string): string {
  if (invoice.dueState === "paid") {
    const late = lateDays(invoice);
    return late > 0 ? `Paid ${plural(late, "day")} late` : "Paid";
  }
  const untilDue = daysBetween(today, invoice.dueOn);
  if (untilDue > 0) return `Due in ${plural(untilDue, "day")}`;
  if (untilDue === 0) return "Due today";
  return `${plural(-untilDue, "day")} late`;
}

// The row's own words come first and unbroken, then the date, so the visible text is part of the
// name a screen reader or voice control user hears.
function accessibleName(
  invoice: InvoiceSummary,
  status: string,
  sharesClientName: boolean,
): string {
  const when =
    invoice.dueState === "paid" && invoice.paidOn
      ? formatDate(invoice.paidOn)
      : `due ${formatDate(invoice.dueOn)}`;
  const figures = `${sharesClientName ? `${invoice.number} · ` : ""}${formatMoney(invoice.amount)}`;
  return `${invoice.client.name} ${figures} ${status}, ${when}`;
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
  scale: { at: (date: string) => number; axisPx: number },
  sharesClientName: boolean,
): DueLineRow {
  const { at, axisPx } = scale;
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
  const paidLate = paid && lateDays(invoice) > 0;

  return {
    invoice,
    segments,
    due,
    end: finish,
    statusAt: Math.max(finish, due),
    sharesClientName,
    endMark: paid ? "filled" : "open",
    endTone,
    statusTone: paid && !paidLate ? "paid" : endTone,
    statusText: status,
    accessibleName: accessibleName(invoice, status, sharesClientName),
  };
}

// An invoice belongs in the default view while its line still reaches into it: unpaid ones always do.
function endsBefore(invoice: InvoiceSummary, windowStart: string): boolean {
  return invoice.dueState === "paid" && (invoice.paidOn ?? invoice.dueOn) < windowStart;
}

function earliest(dates: string[]): string {
  return dates.reduce((a, b) => (b < a ? b : a));
}

function latest(dates: string[]): string {
  return dates.reduce((a, b) => (b > a ? b : a));
}

function tickLabelled(position: number, today: number, axisPx: number): boolean {
  return Math.abs(position - today) * axisPx >= TODAY_LABEL_CLEARANCE_PX;
}

export function layoutDueLine(
  invoices: InvoiceSummary[],
  today: string,
  showOlder: boolean,
  axisPx: number = DEFAULT_AXIS_PX,
): DueLineLayout {
  const windowStart = addDays(today, -HISTORY_DAYS);
  const sorted = [...invoices].sort(newestFirst);
  const older = sorted.filter((invoice) => endsBefore(invoice, windowStart));
  const shown = showOlder ? sorted : sorted.filter((invoice) => !older.includes(invoice));
  if (shown.length === 0) return { today: 0, ticks: [], rows: [], olderCount: older.length };

  const dates = [
    today,
    ...shown.flatMap((invoice) => [
      invoice.issuedOn,
      invoice.dueOn,
      ...(invoice.paidOn ? [invoice.paidOn] : []),
    ]),
  ];
  const first = earliest(dates);
  const origin = showOlder || first > windowStart ? first : windowStart;
  const lastDay = earliest([addDays(latest(dates), AXIS_PADDING_DAYS), addDays(today, AHEAD_DAYS)]);
  const span = Math.max(1, daysBetween(origin, lastDay));
  // Dates outside the axis sit on its edge.
  const at = (date: string): number => Math.min(1, Math.max(0, daysBetween(origin, date) / span));
  const todayAt = at(today);

  const ticks: Tick[] = [];
  for (let day = 0; day <= span; day += TICK_EVERY_DAYS) {
    const position = day / span;
    ticks.push({
      position,
      date: addDays(origin, day),
      labelled: tickLabelled(position, todayAt, axisPx),
    });
  }

  const nameCounts = new Map<string, number>();
  for (const { client } of shown) {
    nameCounts.set(client.name, (nameCounts.get(client.name) ?? 0) + 1);
  }

  return {
    today: todayAt,
    ticks,
    rows: shown.map((invoice) =>
      buildRow(invoice, today, { at, axisPx }, (nameCounts.get(invoice.client.name) ?? 0) > 1),
    ),
    olderCount: older.length,
  };
}
