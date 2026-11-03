const kept = new Map<string, unknown>();

// What a screen last showed, kept for the life of the tab, so opening it again shows that at once
// while the new answer is on its way. A full page load starts empty.
export function recall<T>(key: string): T | undefined {
  return kept.get(key) as T | undefined;
}

export function forget(key: string): void {
  kept.delete(key);
}

// A write, a sign-in or locking the demo changes what the server would say, so nothing seen before
// is shown again as if it were current.
export function forgetRemembered(): void {
  kept.clear();
}

export function remember<T>(key: string, value: T): void {
  kept.set(key, value);
}
