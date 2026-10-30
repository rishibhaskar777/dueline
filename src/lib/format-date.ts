const dayMonthYear = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: string): string {
  return dayMonthYear.format(new Date(`${date}T00:00:00Z`));
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
