"use client";

import { NudgeList } from "./NudgeList";
import { TodayQueue } from "./TodayQueue";
import { useNudges } from "./use-nudges";

export function Nudges() {
  const { state, retry } = useNudges();
  return (
    <div className="grid gap-8">
      <TodayQueue nudges={state.kind === "ready" ? state.nudges : []} />
      <NudgeList state={state} retry={retry} />
    </div>
  );
}
