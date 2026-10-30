import type { Metadata } from "next";
import { ExportRegisterView } from "@/components/export/ExportRegisterView";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Export register" };

export default function ExportPage() {
  return (
    <>
      <PageHeader
        title="Export register"
        intro="Paid invoices with their purpose codes, ready to match PayPal's monthly FIRA."
      />
      <ExportRegisterView />
    </>
  );
}
