export type ShortcutTarget = "palette" | "shortcuts";

interface KeyPress {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: { tagName?: string; isContentEditable?: boolean } | null;
}

const TYPING_IN = ["INPUT", "TEXTAREA", "SELECT"];

function isTyping({ target }: KeyPress): boolean {
  return Boolean(target?.isContentEditable) || TYPING_IN.includes(target?.tagName ?? "");
}

// Ctrl+K (Cmd+K on a Mac) opens the palette from anywhere. "?" opens the list of shortcuts, but not
// while someone is typing, where it is just a question mark.
export function shortcutFor(press: KeyPress): ShortcutTarget | null {
  if (press.altKey) return null;
  if ((press.ctrlKey || press.metaKey) && press.key.toLowerCase() === "k") return "palette";
  if (press.key === "?" && !press.ctrlKey && !press.metaKey && !isTyping(press)) return "shortcuts";
  return null;
}

export const SHORTCUTS = [
  { keys: "Ctrl K or Cmd K", does: "Open the command palette" },
  { keys: "?", does: "Show this list" },
  { keys: "Up and Down arrows", does: "Move through the results" },
  { keys: "Enter", does: "Choose the highlighted result" },
  { keys: "Esc", does: "Close the dialog" },
] as const;

export const OPEN_PALETTE_EVENT = "dueline:open-palette";
