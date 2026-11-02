import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/types";
import { DOT_CLASSES, timelineDot } from "./timeline-dot";
import { describeTimelineEvent, timelineWhen } from "./timeline-text";

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <section
      aria-labelledby="timeline-title"
      className="surface p-7 [--h2-size:24px] [--surface-radius:24px]"
    >
      <h2 id="timeline-title">History</h2>
      <ol className="mt-3">
        {events.map((event) => (
          <li key={event.id} className="grid grid-cols-[12px_minmax(0,1fr)] gap-x-3.5">
            <span aria-hidden="true" className="flex flex-col items-center">
              <span
                className={cn(
                  "mt-[5px] size-3 shrink-0 rounded-full",
                  DOT_CLASSES[timelineDot(event.kind)],
                )}
              />
              <span className="min-h-[30px] w-0.5 flex-1 bg-line" />
            </span>
            <div className="pb-[18px]">
              <p className="text-base font-semibold">{describeTimelineEvent(event)}</p>
              <p className="text-sm text-muted-foreground">
                <time dateTime={event.at}>{timelineWhen(event.at)}</time>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
