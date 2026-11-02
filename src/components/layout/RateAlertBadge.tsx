// How many rate alerts are triggered, beside the page where they are set.
export function RateAlertBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-auto rounded-full bg-due-soon px-2 text-xs font-semibold text-primary-foreground">
      {count}
      <span className="sr-only"> rate {count === 1 ? "alert" : "alerts"} triggered</span>
    </span>
  );
}
