import type { Metadata } from "next";
import { Suspense } from "react";
import { PrintInvoice } from "@/components/print/PrintInvoice";

export const metadata: Metadata = { title: "Tax invoice" };

async function Print({ params }: Pick<PageProps<"/invoices/[id]/print">, "params">) {
  const { id } = await params;
  return <PrintInvoice invoiceId={id} />;
}

export default function PrintPage({ params }: PageProps<"/invoices/[id]/print">) {
  return (
    <Suspense>
      <Print params={params} />
    </Suspense>
  );
}
