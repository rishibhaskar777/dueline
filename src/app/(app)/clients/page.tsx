import type { Metadata } from "next";
import { ClientsScreen } from "@/components/clients/ClientsScreen";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <>
      <PageHeader
        title="Clients"
        intro="Who you invoice, how reliably they pay, and what is still owed."
      />
      <ClientsScreen />
    </>
  );
}
