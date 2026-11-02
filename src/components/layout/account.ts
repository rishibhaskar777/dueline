// The first letters of the first and last word of the name, in capitals. Null for an empty name.
export function initialsOf(name: string): string | null {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const letters = [words[0], words.length > 1 ? words[words.length - 1] : ""];
  return letters
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}

export function accountLabel(name: string, rateAlerts: number): string {
  const base = name.trim() ? `Account menu for ${name.trim()}` : "Account menu";
  if (rateAlerts === 0) return base;
  return `${base}, ${rateAlerts} rate ${rateAlerts === 1 ? "alert" : "alerts"}`;
}
