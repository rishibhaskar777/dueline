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
export const TODAY_LABEL_CLEARANCE_PX = 48;
// Week labels are thinned out until this much room separates neighbours.
export const MIN_LABEL_SPACING_PX = 56;
// The line column is never narrower than this on a laptop, so it is the safe width to assume before
// the real one is measured.
export const DEFAULT_AXIS_PX = 448;

// The colour of a row's bar, end dot and status words.
export type LineTone = "paid" | "blue" | "due_soon" | "late";

export interface DueLineRow {
  invoice: InvoiceSummary;
  tone: LineTone;
  from: number;
  due: number;
  end: number;
  // The line began before the chart's first date, so it is drawn from the left edge with an arrow.
  startsBeforeChart: boolean;
  endMark: "filled" | "open";
  statusText: string;
  accessibleName: string;
}

interface Tick {
  position: number;
  date: string;
  // False when the label would run into the "Today" label or its neighbour.
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
function accessibleName(invoice: InvoiceSummary, status: string): string {
  const when =
    invoice.dueState === "paid" && invoice.paidOn
      ? formatDate(invoice.paidOn)
      : `due ${formatDate(invoice.dueOn)}`;
  return `${invoice.client.name} ${invoice.number} · ${formatMoney(invoice.amount)} ${status}, ${when}`;
}

function toneOf(invoice: InvoiceSummary): LineTone {
  switch (invoice.dueState) {
    case "paid":
      return lateDays(invoice) > 0 ? "late" : "paid";
    case "overdue":
      return "late";
    case "due_soon":
      return "due_soon";
    case "on_time":
      return "blue";
  }
}

function buildRow(
  invoice: InvoiceSummary,
  today: string,
  scale: { at: (date: string) => number; axisPx: number; origin: string },
): DueLineRow {
  const { at, axisPx, origin } = scale;
  const from = at(invoice.issuedOn);
  const paid = invoice.dueState === "paid";
  // An unpaid line never shrinks to a dot: it is at least MIN_LINE_PX long on screen.
  const end = paid
    ? at(invoice.paidOn ?? invoice.dueOn)
    : Math.max(at(today), from + MIN_LINE_PX / axisPx);
  const status = statusText(invoice, today);

  return {
    invoice,
    tone: toneOf(invoice),
    from,
    due: at(invoice.dueOn),
    end,
    startsBeforeChart: invoice.issuedOn < origin,
    endMark: paid ? "filled" : "open",
    statusText: status,
    accessibleName: accessibleName(invoice, status),
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

// Every how-manyth week gets a label, so neighbours keep MIN_LABEL_SPACING_PX apart on a narrow line.
function labelStride(span: number, axisPx: number): number {
  return Math.max(1, Math.ceil(MIN_LABEL_SPACING_PX / ((axisPx * TICK_EVERY_DAYS) / span)));
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

  const stride = labelStride(span, axisPx);
  const ticks: Tick[] = [];
  for (let day = 0; day <= span; day += TICK_EVERY_DAYS) {
    const position = day / span;
    ticks.push({
      position,
      date: addDays(origin, day),
      labelled: ticks.length % stride === 0 && tickLabelled(position, todayAt, axisPx),
    });
  }

  return {
    today: todayAt,
    ticks,
    rows: shown.map((invoice) => buildRow(invoice, today, { at, axisPx, origin })),
    olderCount: older.length,
  };
}
