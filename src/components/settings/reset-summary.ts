import type { DemoResetResponse } from "@/types";

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function describeReset(result: DemoResetResponse): string {
  const parts = [
    `${plural(result.cancelled, "invoice")} cancelled`,
    `${plural(result.deleted, "draft")} deleted`,
    `${plural(result.created, "sample invoice")} created`,
    `${result.skipped} already in place`,
  ];
  const failed =
    result.failed > 0
      ? ` ${plural(result.failed, "sample invoice")} could not be created. Reset again in ten minutes.`
      : "";
  return `Demo reset: ${parts.join(", ")}.${failed}`;
}
