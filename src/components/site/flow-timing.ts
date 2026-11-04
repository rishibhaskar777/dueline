// The "How a payment reaches Dueline" animation is one payment travelling across the cards. A cycle is
// split in equal parts, one per rail; every dot runs the same keyframes and starts one part later than
// the one before. Every number below comes from these two constants.
export const FLOW_CYCLE_SECONDS = 4.8;
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

// Rail 0 runs first, rail 1 one part of the cycle later, and so on.
export function railDelay(rail: number, rails: number): string {
  return seconds((rail * FLOW_CYCLE_SECONDS) / rails);
}

// A card lights up as the dot reaches it: the first at the start of the cycle, the others when the
// rail before them ends. The last card's rail ends as the cycle does, which is when the first card
// lights up again, so the last card's highlight finishes at that moment instead of starting at it.
export function cardDelay(card: number, cards: number): string {
  const rails = cards - 1;
  if (card < cards - 1) return railDelay(card, rails);
  return seconds(FLOW_CYCLE_SECONDS - FLOW_HIGHLIGHT_SECONDS);
}

// Keyframes for a card's highlight: it fades in and out within FLOW_HIGHLIGHT_SECONDS of the cycle.
export function cardHighlightKeyframes(): string {
  const end = (FLOW_HIGHLIGHT_SECONDS / FLOW_CYCLE_SECONDS) * 100;
  const peak = end / 2;
  return `@keyframes dl-flow-card{0%,${end}%,100%{box-shadow:${BASE_SHADOW}}${peak}%{box-shadow:${PEAK_SHADOW}}}`;
}
