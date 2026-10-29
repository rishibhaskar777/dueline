import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "New invoice" };

export default function NewInvoicePage() {
  return (
    <PageHeader
      title="New invoice from a client chat"
      intro="Paste the conversation where the work was agreed."
    />
  );
}
