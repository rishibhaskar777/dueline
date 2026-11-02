// columns and rows are the widget's size on the six-column grid from the lg breakpoint up; shown is
// whether the default layout includes it.
export const WIDGETS = [
  { id: "morning", title: "This morning", columns: 6, rows: 1, shown: true },
  { id: "checklist", title: "Getting started", columns: 6, rows: 1, shown: true },
  { id: "totals", title: "Totals", columns: 6, rows: 1, shown: true },
  { id: "dueLine", title: "Due line", columns: 4, rows: 2, shown: true },
  { id: "forecast", title: "Forecast", columns: 2, rows: 1, shown: true },
  { id: "lateClients", title: "Late clients", columns: 2, rows: 1, shown: true },
  { id: "invoices", title: "Invoices", columns: 6, rows: 1, shown: true },
  { id: "feesLost", title: "Fees lost", columns: 3, rows: 1, shown: true },
  { id: "activity", title: "Activity", columns: 3, rows: 1, shown: true },
  { id: "upcomingDue", title: "Upcoming due", columns: 3, rows: 1, shown: false },
  { id: "rates", title: "Rates", columns: 3, rows: 1, shown: false },
] as const;
export type WidgetId = (typeof WIDGETS)[number]["id"];

export interface LayoutEntry {
  id: WidgetId;
  visible: boolean;
}

export type Layout = LayoutEntry[];

export const LAYOUT_STORAGE_KEY = "dueline.layout.v2";

export const DEFAULT_LAYOUT: Layout = WIDGETS.map(({ id, shown }) => ({ id, visible: shown }));

const isWidgetId = (value: unknown): value is WidgetId => WIDGETS.some(({ id }) => id === value);

function isEntry(value: unknown): value is LayoutEntry {
  if (typeof value !== "object" || value === null) return false;
  const { id, visible } = value as Record<string, unknown>;
  return isWidgetId(id) && typeof visible === "boolean";
}

// Whatever was saved is untrusted: unknown or repeated widgets are dropped, and widgets added since
// it was saved are appended, shown.
function validateLayout(value: unknown): Layout {
  if (!Array.isArray(value)) return DEFAULT_LAYOUT;
  const saved = value.filter(isEntry);
  const kept = saved.filter((entry, index) => saved.findIndex((e) => e.id === entry.id) === index);
  const missing = DEFAULT_LAYOUT.filter(({ id }) => !kept.some((entry) => entry.id === id)).map(
    ({ id }) => ({ id, visible: true }),
  );
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

export function widgetSize(id: WidgetId): { columns: 2 | 3 | 4 | 6; rows: 1 | 2 } {
  const { columns, rows } = WIDGETS.find((widget) => widget.id === id) ?? WIDGETS[0];
  return { columns, rows };
}
