import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClientScreen } from "@/components/clients/ClientScreen";
import { clientKeySchema } from "@/types";

export const metadata: Metadata = { title: "Client" };

async function Client({ params }: Pick<PageProps<"/clients/by-key/[key]">, "params">) {
  const key = clientKeySchema.safeParse((await params).key);
  if (!key.success) notFound();
  return <ClientScreen clientKey={key.data} />;
}

export default function ClientPage({ params }: PageProps<"/clients/by-key/[key]">) {
  return (
    <Suspense>
      <Client params={params} />
    </Suspense>
  );
}
