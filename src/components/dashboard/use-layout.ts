"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_LAYOUT,
  LAYOUT_STORAGE_KEY,
  parseLayout,
  resetLayout,
  type Layout,
} from "./dashboard-layout";

const listeners = new Set<() => void>();
// What the user chose while storage could not be written, so the page still follows their choice.
let unsaved: Layout | null = null;
let snapshot: { raw: string | null; layout: Layout } = { raw: null, layout: DEFAULT_LAYOUT };

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(LAYOUT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): Layout {
  if (unsaved) return unsaved;
  const raw = readRaw();
  if (raw !== snapshot.raw) snapshot = { raw, layout: parseLayout(raw) };
  return snapshot.layout;
}

function getServerSnapshot(): Layout {
  return DEFAULT_LAYOUT;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function save(layout: Layout): void {
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    unsaved = null;
  } catch {
    unsaved = layout;
  }
  listeners.forEach((listener) => listener());
}

interface LayoutControls {
  layout: Layout;
  change: (next: Layout) => void;
  reset: () => void;
}

// The server and the first render use the default layout; the saved one replaces it once the page
// is in the browser.
export function useLayout(): LayoutControls {
  const layout = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { layout, change: save, reset: () => save(resetLayout()) };
}
