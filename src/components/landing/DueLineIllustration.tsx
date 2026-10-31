const TODAY_X = 250;

type Tone = "paid" | "due-soon" | "late";

interface Row {
  label: string;
  status: string;
  tone: Tone;
  y: number;
  sentX: number;
  dueX: number;
  endX: number;
}

// The same encoding as the receivables chart: blue from sent to due, then the colour of the state.
const ROWS: Row[] = [
  {
    label: "Halden Coffee Co.",
    status: "Paid",
    tone: "paid",
    y: 38,
    sentX: 16,
    dueX: 220,
    endX: 196,
  },
  {
    label: "Northpine Studio",
    status: "Due in 3 days",
    tone: "due-soon",
    y: 90,
    sentX: 56,
    dueX: 300,
    endX: TODAY_X,
  },
  {
    label: "Okafor & Reyes",
    status: "7 days late",
    tone: "late",
    y: 142,
    sentX: 36,
    dueX: 170,
    endX: TODAY_X,
  },
];

const STROKE: Record<Tone, string> = {
  paid: "stroke-paid",
  "due-soon": "stroke-due-soon",
  late: "stroke-late",
};
const FILL: Record<Tone, string> = {
  paid: "fill-paid",
  "due-soon": "fill-due-soon",
  late: "fill-late",
};

function InvoiceLine({ row }: { row: Row }) {
  const { y, sentX, dueX, endX, tone } = row;
  const paid = tone === "paid";
  const blueEnd = Math.min(dueX, endX);
  return (
    <g>
      <text x={sentX} y={y - 14} className="fill-foreground text-[12px] font-medium">
        {row.label}
        <tspan className={`${FILL[tone]} font-normal`}> · {row.status}</tspan>
      </text>
      {!paid && (
        <line x1={sentX} x2={blueEnd} y1={y} y2={y} strokeWidth={3} className="stroke-blue" />
      )}
      {paid && <line x1={sentX} x2={endX} y1={y} y2={y} strokeWidth={3} className={STROKE.paid} />}
      {!paid && endX > dueX && (
        <line x1={dueX} x2={endX} y1={y} y2={y} strokeWidth={3} className={STROKE[tone]} />
      )}
      <circle cx={sentX} cy={y} r={4} className="fill-blue" />
      <line x1={dueX} x2={dueX} y1={y - 7} y2={y + 7} strokeWidth={2} className="stroke-navy" />
      <circle cx={endX} cy={y} r={5} className={FILL[tone]} />
    </g>
  );
}

export function DueLineIllustration() {
  return (
    <figure className="rounded-2xl bg-white p-5 text-foreground shadow-lg">
      <svg viewBox="0 0 360 184" aria-hidden="true" className="w-full">
        <line
          x1={TODAY_X}
          x2={TODAY_X}
          y1={8}
          y2={160}
          strokeWidth={1}
          strokeDasharray="3 3"
          className="stroke-muted-foreground"
        />
        <text x={TODAY_X} y={178} textAnchor="middle" className="fill-muted-foreground text-[11px]">
          Today
        </text>
        {ROWS.map((row) => (
          <InvoiceLine key={row.label} row={row} />
        ))}
      </svg>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        Every invoice is a line from sent to due. A payment that runs past today turns red, so late
        clients stand out.
      </figcaption>
    </figure>
  );
}
