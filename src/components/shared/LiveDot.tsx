import { cn } from "@/lib/utils";

type LiveDotTone = "live" | "idle" | "error";

const TONE_CLASS: Record<LiveDotTone, string> = {
  live: "dl-live",
  idle: "bg-muted-foreground",
  error: "bg-late",
};

// The dot beside a status that means "live" or "connected". Only the live tone glows and pulses; the
// text beside the dot carries the meaning, so the dot is hidden from assistive technology.
export function LiveDot({ tone = "live" }: { tone?: LiveDotTone }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2 shrink-0 rounded-full", TONE_CLASS[tone])}
    />
  );
}
