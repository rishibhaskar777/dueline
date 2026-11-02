"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { pickIndicator, type IndicatorItem } from "./sliding-indicator";

const SPRING = "cubic-bezier(0.34, 1.45, 0.4, 1)";
const MOVE = `transform 0.55s ${SPRING}, width 0.55s ${SPRING}`;

function sameItems(a: IndicatorItem[], b: IndicatorItem[]): boolean {
  return (
    a.length === b.length &&
    a.every((item, i) => item.left === b[i].left && item.width === b[i].width)
  );
}

interface Click {
  index: number;
  // The active index when the click happened; the click stops counting once that changes.
  whileActive: number | null;
}

interface SlidingIndicatorOptions {
  // The positioned element that holds the items, and the items themselves in order.
  containerRef: RefObject<HTMLElement | null>;
  itemRefs: RefObject<(HTMLElement | null)[]>;
  count: number;
  active: number | null;
}

// Measures the items of a tab bar or segmented control and returns the style of the pill that
// slides under the hovered, focused, clicked or active one.
export function useSlidingIndicator({
  containerRef,
  itemRefs,
  count,
  active,
}: SlidingIndicatorOptions) {
  const measured = useRef(false);
  const frame = useRef(0);
  const [items, setItems] = useState<IndicatorItem[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [click, setClick] = useState<Click | null>(null);
  // Off until the first measurement has been painted, so the pill does not fly in from the left.
  const [settled, setSettled] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    function measure(): void {
      const next = Array.from({ length: count }, (_, index) => {
        const node = itemRefs.current[index];
        return { left: node?.offsetLeft ?? 0, width: node?.offsetWidth ?? 0 };
      });
      setItems((previous) => (sameItems(previous, next) ? previous : next));
      setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      if (!measured.current && next.some((item) => item.width > 0)) {
        measured.current = true;
        frame.current = requestAnimationFrame(() => {
          frame.current = requestAnimationFrame(() => setSettled(true));
        });
      }
    }

    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    for (const node of itemRefs.current.slice(0, count)) {
      if (node) observer.observe(node);
    }
    void document.fonts.ready.then(measure);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [containerRef, itemRefs, count]);

  const clicked = click && click.whileActive === active ? click.index : null;
  const target = pickIndicator({ items, active, hovered, focused, clicked });

  const indicatorStyle: CSSProperties = target
    ? {
        transform: `translateX(${target.x}px)`,
        width: target.width,
        transition: settled && !reduceMotion ? MOVE : "none",
      }
    : { width: 0, opacity: 0, transition: "none" };

  return {
    highlighted: target?.index ?? null,
    indicatorStyle,
    containerProps: { onPointerLeave: () => setHovered(null) },
    itemProps: (index: number) => ({
      onPointerEnter: () => setHovered(index),
      onFocus: () => setFocused(index),
      onBlur: () => setFocused((current) => (current === index ? null : current)),
      onClick: () => {
        setClick({ index, whileActive: active });
        setHovered(null);
      },
    }),
  };
}
