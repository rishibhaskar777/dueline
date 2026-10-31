import type { TimelineEvent } from "@/types";
import { describeTimelineEvent, timelineWhen } from "./timeline-text";

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <section
      aria-labelledby="timeline-title"
      className="rounded-xl border border-line bg-white p-6"
    >
      <h2 id="timeline-title" className="text-xl font-semibold">
        History
      </h2>
      <ol className="mt-3 divide-y divide-line">
        {events.map((event) => (
          <li key={event.id} className="py-3">
            <p className="text-sm font-medium">{describeTimelineEvent(event)}</p>
            <p className="text-xs text-muted-foreground">
              <time dateTime={event.at}>{timelineWhen(event.at)}</time>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
