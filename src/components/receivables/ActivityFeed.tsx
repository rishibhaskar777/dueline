"use client";

import { useState } from "react";
import { formatTimestamp } from "@/lib/format-date";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/types";
import { ACTIVITY_PREVIEW, describeEvent, eventWhen, visibleEvents } from "./activity-text";

interface ActivityFeedProps {
  // Null until the activity has loaded.
  events: ActivityEvent[] | null;
  today: string;
  freshEvents: ActivityEvent[];
}

export function ActivityFeed({ events, today, freshEvents }: ActivityFeedProps) {
  const [expanded, setExpanded] = useState(false);
  const fresh = new Set(freshEvents.map((event) => event.id));

  return (
    <section aria-labelledby="activity-title" className="surface p-[26px]">
      <h2 id="activity-title">Activity</h2>
      <p aria-live="polite" className="sr-only">
        {freshEvents.map(describeEvent).join(". ")}
      </p>
      {events === null ? (
        <div role="status" aria-label="Loading activity" className="mt-3 grid gap-3">
          <SkeletonBlock className="h-5" />
          <SkeletonBlock className="h-5" />
          <SkeletonBlock className="h-5" />
        </div>
      ) : events.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Payments and sends will appear here as PayPal reports them.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {visibleEvents(events, expanded).map((event) => (
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
      {events !== null && events.length > ACTIVITY_PREVIEW && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="mt-3 rounded-md text-sm font-semibold text-blue hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {expanded ? "Show fewer" : `Show all ${events.length}`}
        </button>
      )}
    </section>
  );
}
