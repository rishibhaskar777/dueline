import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoiceScreen } from "@/components/invoice-page/InvoiceScreen";

export const metadata: Metadata = { title: "Invoice" };

async function Invoice({ params }: Pick<PageProps<"/invoices/[id]">, "params">) {
  const { id } = await params;
  return <InvoiceScreen invoiceId={id} />;
}

export default function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  return (
    <Suspense>
      <Invoice params={params} />
    </Suspense>
  );
}
