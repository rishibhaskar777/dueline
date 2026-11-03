const OLD_AFTER_MS = 5 * 60 * 1000;

// Whether invoices read from PayPal this long ago are worth saying so about. Null means the server
// did not say, which is treated as fresh.
export function isSnapshotOld(loadedAt: string | null, now: number): boolean {
  if (!loadedAt) return false;
  const read = Date.parse(loadedAt);
  return !Number.isNaN(read) && now - read > OLD_AFTER_MS;
}
