import "server-only";
import { getEnv } from "@/lib/env";
import { InvoiceNotFoundError } from "@/lib/invoices/errors";
import { PayPalApiError } from "@/lib/paypal/errors";
import { getInvoice } from "@/lib/paypal/invoices";
import { clearInvoiceCaches } from "@/lib/paypal/summaries";
import { getStore } from "@/lib/store";
import { DemoUnavailableError } from "./errors";

// Hides an invoice from every screen and export in the demo, or shows it again. The invoice stays in
// PayPal and keeps its own page.
export async function setInvoiceHiddenInDemo(invoiceId: string, hidden: boolean): Promise<void> {
  if (!getEnv().DEMO_MODE) throw new DemoUnavailableError();
  try {
    await getInvoice(invoiceId);
  } catch (error) {
    if (error instanceof PayPalApiError && error.status === 404) throw new InvoiceNotFoundError();
    throw error;
  }
  await getStore().setInvoiceHidden(invoiceId, hidden);
  clearInvoiceCaches();
}
