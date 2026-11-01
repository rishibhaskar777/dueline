export interface Searchable {
  label: string;
  // Extra words that find the item without being shown, such as an invoice number.
  keywords?: string;
}

function words(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

// Every word typed has to appear somewhere in the item. Items whose label starts with the first word
// come first; otherwise the order is kept.
export function filterByQuery<T extends Searchable>(items: readonly T[], query: string): T[] {
  const typed = words(query);
  if (typed.length === 0) return [...items];

  const matches = items.filter((item) => {
    const haystack = `${item.label} ${item.keywords ?? ""}`.toLowerCase();
    return typed.every((word) => haystack.includes(word));
  });
  const starts = (item: T): number => (item.label.toLowerCase().startsWith(typed[0]) ? 0 : 1);
  return matches
    .map((item, index) => ({ item, index }))
    .sort((a, b) => starts(a.item) - starts(b.item) || a.index - b.index)
    .map(({ item }) => item);
}
