"use client";

import { NudgeList } from "./NudgeList";
import { TodayQueue } from "./TodayQueue";

export function Nudges() {
  return (
    <div className="grid gap-8">
      <TodayQueue />
      <NudgeList />
    </div>
  );
}
