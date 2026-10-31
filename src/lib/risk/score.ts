import { daysBetween } from "@/lib/date-math";
import type { ClientRisk, InvoiceSummary, RiskLevel } from "@/types";

type ClientScore = Omit<ClientRisk, "clientEmail" | "clientName">;

interface Reading {
  invoice: InvoiceSummary;
  daysLate: number;
}

// A client who is a day or two late is still treated as reliable.
const MINOR_LATE_DAYS = 2;
const LATE_PAYER_AVERAGE_DAYS = 5;
const LONG_OVERDUE_DAYS = 30;

const DISCOUNT_WITHIN_DAYS = 7;
const DISCOUNT_PERCENT: Record<RiskLevel, number | null> = {
  late_payer: 2,
  watch: 1,
  reliable: null,
};

// An invoice that is open and not yet due says nothing about the client, so it is left out.
function readingOf(invoice: InvoiceSummary, today: string): Reading | null {
  if (invoice.dueState === "paid") {
    const daysLate = invoice.paidOn ? daysBetween(invoice.dueOn, invoice.paidOn) : 0;
    return { invoice, daysLate: Math.max(0, daysLate) };
  }
  if (invoice.dueState === "overdue") {
    return { invoice, daysLate: Math.max(0, daysBetween(invoice.dueOn, today)) };
  }
  return null;
}

const isOverdueNow = ({ invoice }: Reading): boolean => invoice.dueState === "overdue";

function levelOf(late: Reading[], averageDaysLate: number): RiskLevel {
  if (late.every(({ daysLate }) => daysLate <= MINOR_LATE_DAYS)) return "reliable";
  const longOverdue = late.some(
    (reading) => isOverdueNow(reading) && reading.daysLate > LONG_OVERDUE_DAYS,
  );
  if (longOverdue || (late.length >= 2 && averageDaysLate >= LATE_PAYER_AVERAGE_DAYS)) {
    return "late_payer";
  }
  return "watch";
}

function days(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

function reasonOf(name: string, readings: Reading[], late: Reading[], average: number): string {
  if (readings.length === 0) return "No earlier invoices to this client.";
  if (late.length === 0) return `${name} has paid on time.`;
  if (late.every(({ daysLate }) => daysLate <= MINOR_LATE_DAYS)) {
    return `${name} has never been more than ${days(MINOR_LATE_DAYS)} late.`;
  }

  const overdue = late.filter(isOverdueNow);
  if (overdue.length === late.length) {
    return overdue.length === 1
      ? `${name} has one invoice ${days(overdue[0].daysLate)} overdue.`
      : `${name} has ${overdue.length} invoices overdue, ${days(average)} late on average.`;
  }
  const verb = overdue.length === 0 ? "paid" : "was late on";
  const noun = overdue.length === 0 ? "invoices late" : "invoices";
  return `${name} ${verb} ${late.length} of ${readings.length} ${noun}, ${days(average)} on average.`;
}

// The invoices are one client's, so the name in the reason is the first invoice's.
export function scoreClient(invoices: InvoiceSummary[], today: string): ClientScore {
  const readings = invoices.flatMap((invoice) => {
    const reading = readingOf(invoice, today);
    return reading ? [reading] : [];
  });
  const late = readings.filter(({ daysLate }) => daysLate > 0);
  const total = late.reduce((sum, { daysLate }) => sum + daysLate, 0);
  const averageDaysLate = late.length === 0 ? 0 : Math.round((total / late.length) * 10) / 10;

  const level = levelOf(late, averageDaysLate);
  const percent = DISCOUNT_PERCENT[level];
  return {
    invoicesConsidered: readings.length,
    lateCount: late.length,
    averageDaysLate,
    level,
    suggestion:
      percent === null
        ? null
        : { kind: "early_payment_discount", percent, withinDays: DISCOUNT_WITHIN_DAYS },
    reason: reasonOf(invoices[0]?.client.name ?? "", readings, late, averageDaysLate),
  };
}
