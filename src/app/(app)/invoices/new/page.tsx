import type { Metadata } from "next";
import { NewInvoice } from "@/components/invoices/NewInvoice";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "New invoice" };

export default function NewInvoicePage() {
  return (
    <>
      <PageHeader
        title="New invoice"
        intro="Paste the conversation where the work was agreed, review the draft, then send it."
      />
      <NewInvoice />
    </>
  );
}
