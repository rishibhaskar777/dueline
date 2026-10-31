import type { ReactNode } from "react";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { Button } from "@/components/ui/button";
import type { DashboardResponse } from "@/types";
import type { DashboardState } from "./use-dashboard";

interface DashboardWidgetProps {
  id: string;
  title: string;
  state: DashboardState;
  onRetry: () => void;
  // Words for a widget with nothing to show; null when it always has something to say.
  emptyText: string | null;
  isEmpty: (data: DashboardResponse) => boolean;
  children: (data: DashboardResponse) => ReactNode;
}

function Body({ state, onRetry, emptyText, isEmpty, children }: DashboardWidgetProps) {
  if (state.kind === "loading") return <SkeletonBlock className="mt-4 h-28" />;
  if (state.kind === "error") {
    return (
      <div role="alert" className="mt-3 grid gap-3">
        <p className="text-sm">{state.error.message}</p>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }
  if (emptyText && isEmpty(state.data)) {
    return <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>;
  }
  return <div className="mt-3">{children(state.data)}</div>;
}

// The frame of every widget that reads the dashboard: a title, and the loading, error and empty
// states in one place.
export function DashboardWidget(props: DashboardWidgetProps) {
  const titleId = `${props.id}-title`;
  return (
    <section
      aria-labelledby={titleId}
      aria-busy={props.state.kind === "loading"}
      className="rounded-xl border border-line bg-white p-6"
    >
      <h2 id={titleId} className="text-xl font-semibold">
        {props.title}
      </h2>
      <Body {...props} />
    </section>
  );
}
