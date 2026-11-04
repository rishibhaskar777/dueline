export interface SplitAmounts {
  depositMinor: number;
  balanceMinor: number;
}

// The deposit is the percent of the total rounded to the cent, and the balance is what is left, so
// the two always add up exactly. Null when either part would be under one cent.
export function splitTotal(totalMinor: number, percent: number): SplitAmounts | null {
  if (!Number.isInteger(totalMinor) || !Number.isInteger(percent)) return null;
  if (percent < 1 || percent > 99) return null;
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) return null;
  // Whole hundreds first, so the product stays exact even for a total near the largest safe integer.
  const wholes = Math.floor(totalMinor / 100);
  const depositMinor = wholes * percent + Math.round(((totalMinor % 100) * percent) / 100);
  const balanceMinor = totalMinor - depositMinor;
  return depositMinor >= 1 && balanceMinor >= 1 ? { depositMinor, balanceMinor } : null;
}
