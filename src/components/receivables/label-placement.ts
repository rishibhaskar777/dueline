// Where a row's end label goes, in pixels along the axis. The label normally sits to the right of its
// dot. Vertical marks (the dashed Today line, a due tick) run through the whole row, so a label that
// would touch one moves to the other side of its dot, above the line; and a label that does not fit
// the axis does the same. When no side is clear it is nudged down below the line, where it at least
// stays off the dot and the line itself.
export const LABEL_GAP_PX = 12;
export const MARK_CLEARANCE_PX = 6;
export const LABEL_CHAR_PX = 6.6;
export const NUDGE_DOWN_PX = 12;
export const RAISE_PX = -10;

export interface LabelPlacement {
  side: "right" | "left";
  // Vertical offset from the line, in pixels: negative is above it.
  dy: number;
}

interface PlacementInput {
  // Where the label would start on the right: after the line's end or its due tick.
  rightStartPx: number;
  // The dot the label belongs to.
  endPx: number;
  widthPx: number;
  axisPx: number;
  // Vertical marks that run through the row: the Today line and the due tick.
  marksPx: number[];
}

export function estimateLabelWidth(text: string): number {
  return Math.ceil(text.length * LABEL_CHAR_PX);
}

function touchesMark(from: number, to: number, marksPx: number[]): boolean {
  return marksPx.some((mark) => mark >= from - MARK_CLEARANCE_PX && mark <= to + MARK_CLEARANCE_PX);
}

export function placeEndLabel(input: PlacementInput): LabelPlacement {
  const { rightStartPx, endPx, widthPx, axisPx, marksPx } = input;
  const rightFrom = rightStartPx + LABEL_GAP_PX;
  const rightTo = rightFrom + widthPx;
  const leftTo = endPx - LABEL_GAP_PX;
  const leftFrom = leftTo - widthPx;

  const rightClear = rightTo <= axisPx && !touchesMark(rightFrom, rightTo, marksPx);
  if (rightClear) return { side: "right", dy: 0 };

  const leftClear = leftFrom >= 0 && !touchesMark(leftFrom, leftTo, marksPx);
  if (leftClear) return { side: "left", dy: RAISE_PX };

  return { side: rightTo <= axisPx ? "right" : "left", dy: NUDGE_DOWN_PX };
}
