import { cn } from "@/lib/utils";

type Tone = "blue" | "late" | "paid";

export interface SampleLine {
  client: string;
  meta: string;
  from: number;
  to: number;
  tone: Tone;
  ended: boolean;
  label: string;
}

const BAR: Record<Tone, string> = {
  blue: "bg-blue-line",
  late: "bg-mark-red",
  paid: "bg-mark-green",
};
const RING: Record<Tone, string> = {
  blue: "border-blue-line",
  late: "border-mark-red",
  paid: "border-mark-green",
};
const TEXT: Record<Tone, string> = { blue: "text-blue", late: "text-late", paid: "text-paid" };

const TICKS = [0, 20, 40, 60, 80];
const TODAY = 80;

// A sample of the Home due line: the same drawing, with the data written out. It is a picture, so a
// sentence beside it says the same in words.
export function StaticDueLine({ lines, summary }: { lines: SampleLine[]; summary: string }) {
  return (
    <div>
      <p className="sr-only">{summary}</p>
      <div aria-hidden="true">
        {lines.map((line) => (
          <div
            key={line.client}
            className="grid items-center gap-x-4 gap-y-1 border-t border-bar-line py-2.5 md:grid-cols-[190px_minmax(0,1fr)_130px]"
          >
            <span className="font-bold">
              {line.client}
              <span className="block text-[13px] font-medium text-subtle">{line.meta}</span>
            </span>
            <div className="relative h-[26px]">
              {TICKS.map((position) => (
                <div
                  key={position}
                  className="absolute inset-y-0 w-px bg-grid-line"
                  style={{ left: `${position}%` }}
                />
              ))}
              <div className="absolute inset-x-0 top-3 h-0.5 bg-rail" />
              <div
                className="absolute -top-2.5 -bottom-2.5 border-l-2 border-dashed border-today-line"
                style={{ left: `${TODAY}%` }}
              />
              <div
                className={cn("dl-bar absolute top-[11px] h-1 rounded-sm", BAR[line.tone])}
                style={{ left: `${line.from}%`, width: `${line.to - line.from}%` }}
              />
              <span
                className={cn(
                  "absolute top-[7px] -ml-1.5 box-border size-3 rounded-full border-[2.5px] bg-dot-ground",
                  RING[line.tone],
                )}
                style={{ left: `${line.from}%` }}
              />
              <span
                className={cn(
                  "absolute top-1.5 -ml-[7px] box-border size-3.5 rounded-full border-[2.5px]",
                  RING[line.tone],
                  line.ended ? BAR[line.tone] : "bg-dot-ground",
                )}
                style={{ left: `${line.to}%` }}
              />
            </div>
            <span className={cn("font-bold", TEXT[line.tone])}>{line.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
