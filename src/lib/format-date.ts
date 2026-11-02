const dayMonthYear = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: string): string {
  return dayMonthYear.format(new Date(`${date}T00:00:00Z`));
}

const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "UTC" });

// "Monday, 2 Nov 2026".
export function formatWeekdayDate(date: string): string {
  return `${weekday.format(new Date(`${date}T00:00:00Z`))}, ${formatDate(date)}`;
}

const dayMonth = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatDayMonth(date: string): string {
  return dayMonth.format(new Date(`${date}T00:00:00Z`));
}

const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function formatTimestamp(timestamp: string): string {
  return `${dateTime.format(new Date(timestamp))} IST`;
}

const monthYear = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatMonth(month: string): string {
  return monthYear.format(new Date(`${month}-01T00:00:00Z`));
}

const monthOnly = new Intl.DateTimeFormat("en-IN", { month: "long", timeZone: "UTC" });

// "November", or "November 2025" when the year is needed.
export function formatMonthName(month: string, withYear: boolean): string {
  return withYear ? formatMonth(month) : monthOnly.format(new Date(`${month}-01T00:00:00Z`));
}
