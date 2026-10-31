const MS_PER_DAY = 86_400_000;

const kolkataDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parseDate(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function todayInKolkata(now: Date = new Date()): string {
  const parts = Object.fromEntries(kolkataDate.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDays(date: string, days: number): string {
  return toIsoDate(parseDate(date) + days * MS_PER_DAY);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to) - parseDate(from)) / MS_PER_DAY);
}

// Months are "YYYY-MM" strings.
export function addMonths(month: string, count: number): string {
  const [year, number] = month.split("-").map(Number);
  const index = year * 12 + (number - 1) + count;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

const FINANCIAL_YEAR = /^(\d{4})-(\d{2})$/;

// The Indian financial year runs from 1 April to 31 March and is named by both years: "2026-27".
export function financialYearOf(month: string): string {
  const [year, number] = month.split("-").map(Number);
  const start = number >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function isFinancialYear(value: string): boolean {
  const match = FINANCIAL_YEAR.exec(value);
  return match !== null && (Number(match[1]) + 1) % 100 === Number(match[2]);
}

export function financialYearRange(fy: string): { from: string; to: string } {
  const start = Number(fy.slice(0, 4));
  return { from: `${start}-04-01`, to: `${start + 1}-03-31` };
}
