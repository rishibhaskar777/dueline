import { formatTimestamp } from "@/lib/format-date";
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
    <section
      aria-labelledby="activity-title"
      className="rounded-xl border border-line bg-white p-6"
    >
      <h2 id="activity-title" className="text-xl font-semibold">
        Activity
      </h2>
      <p aria-live="polite" className="sr-only">
        {freshEvents.map(describeEvent).join(". ")}
      </p>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Payments and sends will appear here as PayPal reports them.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {events.map((event) => (
            <li
              key={event.id}
              className={fresh.has(event.id) ? "event-arrived -mx-2 rounded-md px-2 py-3" : "py-3"}
            >
              <p className="text-sm">{describeEvent(event)}</p>
              <p className="text-xs text-muted-foreground">
                <time dateTime={event.at} title={formatTimestamp(event.at)}>
                  {eventWhen(event.at, today)}
                </time>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
