"use client";

import { UpdatingNote } from "@/components/shared/UpdatingNote";
import { NudgeList } from "./NudgeList";
import { TodayQueue } from "./TodayQueue";
import { useNudges } from "./use-nudges";

export function Nudges() {
  const { state, updating, retry } = useNudges();
  return (
    <div className="grid gap-8">
      <TodayQueue nudges={state.kind === "ready" ? state.nudges : []} />
      {updating && <UpdatingNote />}
      <NudgeList state={state} retry={retry} />
    </div>
  );
}
