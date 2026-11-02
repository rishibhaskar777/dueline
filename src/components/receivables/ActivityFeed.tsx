import { formatTimestamp } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/types";
import { describeEvent, eventWhen } from "./activity-text";

interface ActivityFeedProps {
  events: ActivityEvent[];
  today: string;
  freshEvents: ActivityEvent[];
}

export function ActivityFeed({ events, today, freshEvents }: ActivityFeedProps) {
  const fresh = new Set(freshEvents.map((event) => event.id));

  return (
    <section aria-labelledby="activity-title" className="surface p-[26px]">
      <h2 id="activity-title">Activity</h2>
      <p aria-live="polite" className="sr-only">
        {freshEvents.map(describeEvent).join(". ")}
      </p>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Payments and sends will appear here as PayPal reports them.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {events.map((event) => (
            <li
              key={event.id}
              className={cn(
                "flex justify-between gap-3 text-[15px]",
                fresh.has(event.id) && "event-arrived -mx-2 rounded-md px-2",
              )}
            >
              <span>{describeEvent(event)}</span>
              <time
                dateTime={event.at}
                title={formatTimestamp(event.at)}
                className="text-subtle whitespace-nowrap"
              >
                {eventWhen(event.at, today)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
