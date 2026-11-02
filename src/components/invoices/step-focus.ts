"use client";

import { useEffect, useRef } from "react";

export function scrollBehaviorFor(reduceMotion: boolean): ScrollBehavior {
  return reduceMotion ? "auto" : "smooth";
}

// Brings the new step's h1 into view and moves focus to it, so a screen reader starts at the new
// step and the page does not stay scrolled part-way down.
export function showStepHeading(): void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: scrollBehaviorFor(reduce) });
  const heading = document.querySelector<HTMLElement>("main h1");
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
}

// Runs when `step` changes, not when the screen first opens.
export function useStepFocus(step: string): void {
  const previous = useRef(step);
  useEffect(() => {
    if (previous.current === step) return;
    previous.current = step;
    showStepHeading();
  }, [step]);
}
