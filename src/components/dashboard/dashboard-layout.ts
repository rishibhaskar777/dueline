export const WIDGETS = [
  { id: "morning", title: "This morning", wide: true },
  { id: "totals", title: "Totals", wide: true },
  { id: "forecast", title: "Forecast", wide: false },
  { id: "dueLine", title: "Due line", wide: true },
  { id: "upcomingDue", title: "Upcoming due", wide: false },
  { id: "lateClients", title: "Late clients", wide: false },
  { id: "feesLost", title: "Fees lost", wide: false },
  { id: "rates", title: "Rates", wide: false },
  { id: "invoices", title: "Invoices", wide: true },
  { id: "activity", title: "Activity", wide: false },
] as const;

export type WidgetId = (typeof WIDGETS)[number]["id"];

export interface LayoutEntry {
  id: WidgetId;
  visible: boolean;
}

export type Layout = LayoutEntry[];

export const LAYOUT_STORAGE_KEY = "dueline.layout.v1";

export const DEFAULT_LAYOUT: Layout = WIDGETS.map(({ id }) => ({ id, visible: true }));

const isWidgetId = (value: unknown): value is WidgetId => WIDGETS.some(({ id }) => id === value);

function isEntry(value: unknown): value is LayoutEntry {
  if (typeof value !== "object" || value === null) return false;
  const { id, visible } = value as Record<string, unknown>;
  return isWidgetId(id) && typeof visible === "boolean";
}

// Whatever was saved is untrusted: unknown or repeated widgets are dropped, and widgets added since
// it was saved are appended, shown.
function validateLayout(value: unknown): Layout {
  const saved = Array.isArray(value) ? value.filter(isEntry) : [];
  const kept = saved.filter((entry, index) => saved.findIndex((e) => e.id === entry.id) === index);
  const missing = DEFAULT_LAYOUT.filter(({ id }) => !kept.some((entry) => entry.id === id));
  return [...kept.map(({ id, visible }) => ({ id, visible })), ...missing];
}

export function parseLayout(raw: string | null): Layout {
  if (raw === null) return DEFAULT_LAYOUT;
  try {
    return validateLayout(JSON.parse(raw));
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function moveWidget(layout: Layout, id: WidgetId, step: -1 | 1): Layout {
  const from = layout.findIndex((entry) => entry.id === id);
  const to = from + step;
  if (from === -1 || to < 0 || to >= layout.length) return layout;
  const next = [...layout];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function setWidgetVisible(layout: Layout, id: WidgetId, visible: boolean): Layout {
  return layout.map((entry) => (entry.id === id ? { ...entry, visible } : entry));
}

export function resetLayout(): Layout {
  return DEFAULT_LAYOUT;
}

export function widgetTitle(id: WidgetId): string {
  return WIDGETS.find((widget) => widget.id === id)?.title ?? id;
}

export function isWide(id: WidgetId): boolean {
  return WIDGETS.find((widget) => widget.id === id)?.wide ?? false;
}
