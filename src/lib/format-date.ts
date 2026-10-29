const dayMonthYear = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: string): string {
  return dayMonthYear.format(new Date(`${date}T00:00:00Z`));
}
