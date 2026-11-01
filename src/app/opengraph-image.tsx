import { ImageResponse } from "next/og";

export const alt = "Dueline: get paid by clients abroad without chasing them";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0D1B2E";
const BLUE = "#1F47C7";
const PAID = "#0B7A5C";
const LATE = "#B3261E";
const LINE = "#2A3B55";

interface Bar {
  from: number;
  paidTo?: number;
  lateTo?: number;
}

// Each bar is one invoice, from sent to paid. A bar that runs past the due tick turns red.
const BARS: Bar[] = [
  { from: 4, paidTo: 38 },
  { from: 14, paidTo: 62 },
  { from: 8, lateTo: 76 },
  { from: 30, paidTo: 70 },
];
const DUE_AT = 54;
const TODAY_AT = 76;

function Segment({ from, to, color }: { from: number; to: number; color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${from}%`,
        width: `${to - from}%`,
        top: 14,
        height: 10,
        borderRadius: 5,
        background: color,
      }}
    />
  );
}

function DueLineDrawing() {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 1080 }}>
      {BARS.map((bar, index) => (
        <div
          key={index}
          style={{ display: "flex", position: "relative", width: "100%", height: 38 }}
        >
          <div
            style={{
              position: "absolute",
              left: `${DUE_AT}%`,
              top: 6,
              width: 3,
              height: 26,
              background: "#FFFFFF",
            }}
          />
          {bar.lateTo ? (
            <>
              <Segment from={bar.from} to={DUE_AT} color={BLUE} />
              <Segment from={DUE_AT} to={bar.lateTo} color={LATE} />
            </>
          ) : (
            <Segment from={bar.from} to={bar.paidTo ?? bar.from} color={PAID} />
          )}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: `${TODAY_AT}%`,
          top: -6,
          height: BARS.length * 38 + 12,
          borderLeft: `3px dashed ${LINE}`,
        }}
      />
    </div>
  );
}

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "64px 60px",
        background: NAVY,
        color: "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 8,
              borderRadius: 4,
              background: BLUE,
              marginRight: 16,
            }}
          />
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>Dueline</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 40, lineHeight: 1.1 }}>
          Get paid by clients abroad without chasing them
        </div>
      </div>
      <div style={{ display: "flex", position: "relative" }}>
        <DueLineDrawing />
      </div>
    </div>,
    { ...size },
  );
}
