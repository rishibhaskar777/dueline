// The "How a payment reaches Dueline" animation is one payment travelling across four cards. A cycle
// is four equal quarters: the dot crosses rail 1 in the first, rail 2 in the second and rail 3 in the
// third, and the fourth is a rest with no dot. Card n lights up as the dot reaches it, at n quarters.
// Every number below comes from these constants.
export const FLOW_CYCLE_SECONDS = 5.6;
export const FLOW_QUARTERS = 4;
export const FLOW_HIGHLIGHT_SECONDS = 0.6;

const BASE_SHADOW = "inset 0 0 0 1px var(--glass-edge)";
const PEAK_SHADOW =
  "inset 0 0 0 2px var(--blue-line), 0 0 0 4px color-mix(in srgb, var(--blue-line) 18%, transparent)";

function seconds(value: number): string {
  return `${Math.round(value * 1000) / 1000}s`;
}

export function flowCycle(): string {
  return seconds(FLOW_CYCLE_SECONDS);
}

// Rail 0 runs in the first quarter, rail 1 in the second, and so on.
export function railDelay(rail: number): string {
  return seconds((rail * FLOW_CYCLE_SECONDS) / FLOW_QUARTERS);
}

// Card 0 lights at the start of the cycle and each later card when the rail before it ends.
export function cardDelay(card: number): string {
  return railDelay(card);
}

// Keyframes for a card's highlight: it fades in and out within FLOW_HIGHLIGHT_SECONDS of the cycle.
export function cardHighlightKeyframes(): string {
  const end = (FLOW_HIGHLIGHT_SECONDS / FLOW_CYCLE_SECONDS) * 100;
  const peak = end / 2;
  return `@keyframes dl-flow-card{0%,${end}%,100%{box-shadow:${BASE_SHADOW}}${peak}%{box-shadow:${PEAK_SHADOW}}}`;
}
