"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  NO_INTERACTION,
  indicatorState,
  interact,
  pickIndicator,
  type IndicatorItem,
  type InteractionEvent,
} from "./sliding-indicator";

const SPRING = "cubic-bezier(0.34, 1.45, 0.4, 1)";
const MOVE = `transform 0.55s ${SPRING}, width 0.55s ${SPRING}`;

function sameItems(a: IndicatorItem[], b: IndicatorItem[]): boolean {
  return (
    a.length === b.length &&
    a.every((item, i) => item.left === b[i].left && item.width === b[i].width)
  );
}

interface SlidingIndicatorOptions {
  // The positioned element that holds the items, and the items themselves in order.
  containerRef: RefObject<HTMLElement | null>;
  itemRefs: RefObject<(HTMLElement | null)[]>;
  count: number;
  active: number | null;
  // Hover, focus and clicks are forgotten when this changes; a bar passes the page it is on.
  resetKey?: string | null;
}

// Measures the items of a tab bar or segmented control and returns the style of the pill that
// slides under the hovered, focused, clicked or active one.
export function useSlidingIndicator({
  containerRef,
  itemRefs,
  count,
  active,
  resetKey = null,
}: SlidingIndicatorOptions) {
  const measured = useRef(false);
  const frame = useRef(0);
  const [items, setItems] = useState<IndicatorItem[]>([]);
  const [interaction, dispatch] = useReducer(interact, NO_INTERACTION);
  // Off until the first measurement has been painted, so the pill does not fly in from the left.
  const [settled, setSettled] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const send = useCallback(
    (event: InteractionEvent) => dispatch({ ...event, key: resetKey }),
    [resetKey],
  );
  const { hovered, focused, clicked } = indicatorState(interaction, resetKey, active);
  const isHovered = hovered !== null;

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

  // A pointer can go away without a pointerleave, when a menu opens or the page changes under it, so
  // the pill must not stay behind under the last tab it passed.
  useEffect(() => {
    const clear = () => send({ type: "reset" });
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
    };
  }, [send]);

  useEffect(() => {
    if (!isHovered) return;
    function onPointerOver(event: globalThis.PointerEvent): void {
      const inside = event.target instanceof Node && containerRef.current?.contains(event.target);
      if (!inside) send({ type: "pointerleave" });
    }
    document.addEventListener("pointerover", onPointerOver);
    return () => document.removeEventListener("pointerover", onPointerOver);
  }, [isHovered, containerRef, send]);

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
    containerProps: { onPointerLeave: () => send({ type: "pointerleave" }) },
    itemProps: (index: number) => ({
      onPointerEnter: (event: PointerEvent<HTMLElement>) =>
        send({ type: "pointerenter", index, pointerType: event.pointerType }),
      onFocus: (event: FocusEvent<HTMLElement>) =>
        send({ type: "focus", index, visible: event.currentTarget.matches(":focus-visible") }),
      onBlur: () => send({ type: "blur", index }),
      onClick: () => send({ type: "click", index, active }),
    }),
  };
}
