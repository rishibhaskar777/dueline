import type { Metadata } from "next";
import { Suspense } from "react";
import { NewInvoice } from "@/components/invoices/NewInvoice";
import { clientSchema, repeatIdSchema } from "@/types";

export const metadata: Metadata = { title: "New invoice" };

const nameSchema = clientSchema.shape.name;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// The address can carry a client's name or the invoice to copy; anything that does not look right is
// ignored and the page opens as usual.
async function Form({ searchParams }: Pick<PageProps<"/invoices/new">, "searchParams">) {
  const query = await searchParams;
  const name = nameSchema.safeParse(single(query.client)?.trim());
  const duplicate = single(query.duplicate)?.trim();
  const repeat = repeatIdSchema.safeParse(single(query.repeat)?.trim());
  return (
    <NewInvoice
      prefill={{
        clientName: name.success ? name.data : null,
        duplicateId: duplicate && duplicate.length <= 100 ? duplicate : null,
        repeatId: repeat.success ? repeat.data : null,
        sampleChat: single(query.sample) === "1",
      }}
    />
  );
}

export default function NewInvoicePage({ searchParams }: PageProps<"/invoices/new">) {
  return (
    <Suspense>
      <Form searchParams={searchParams} />
    </Suspense>
  );
}
