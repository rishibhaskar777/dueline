// An average of days is kept exact in the data and shown in whole days.
export function wholeDays(count: number): number {
  return Math.round(count);
}

export function formatDays(count: number): string {
  const whole = wholeDays(count);
  return `${whole} ${whole === 1 ? "day" : "days"}`;
}
