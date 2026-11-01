import "server-only";
import { getEnv } from "@/lib/env";
import { loadInvoices, type LoadedInvoice } from "@/lib/paypal/summaries";
import { getStore } from "@/lib/store";
import { isShownInDemo } from "./visibility";

// 0 before the first reset: invoices made before generations existed count as generation 0, so the
// story already there stays on show until the demo is reset.
async function currentGenerationId(): Promise<number> {
  return (await getStore().getDemoGeneration())?.id ?? 0;
}

// Every list that feeds a screen or an export reads its invoices here, so what is hidden in the demo
// is hidden everywhere. Outside demo mode nothing is hidden.
export async function loadVisibleInvoices(): Promise<LoadedInvoice[]> {
  const all = await loadInvoices();
  if (!getEnv().DEMO_MODE) return all;

  const store = getStore();
  const [generation, hidden] = await Promise.all([
    currentGenerationId(),
    store.listHiddenInvoices(),
  ]);
  const hiddenIds = new Set(hidden);
  return all.filter(({ summary, marker }) =>
    isShownInDemo({ id: summary.id, marker, status: summary.paypalStatus }, generation, hiddenIds),
  );
}
