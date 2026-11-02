"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { useLoad } from "@/components/shared/use-load";
import { getClients } from "@/lib/api-client";
import { ClientCards } from "./ClientCards";
import { searchClients, sortClients } from "./client-list";
import { ClientSearchBox } from "./ClientSearchBox";

function Header({ search }: { search?: { value: string; onChange: (value: string) => void } }) {
  return (
    <PageHeader
      title="Clients"
      intro="Who you invoice, how reliably they pay, and what is still owed."
      actions={search && <ClientSearchBox {...search} />}
    />
  );
}

export function ClientsScreen() {
  const { state, reload } = useLoad(getClients);
  const [search, setSearch] = useState("");

  if (state.kind === "loading") {
    return (
      <>
        <Header />
        <div aria-hidden="true" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonBlock key={index} className="h-48 rounded-[24px]" />
          ))}
        </div>
      </>
    );
  }
  if (state.kind === "error") {
    return (
      <>
        <Header />
        <LoadFailure title="Couldn't load your clients" error={state.error} onRetry={reload} />
      </>
    );
  }
  if (state.data.length === 0) {
    return (
      <>
        <Header />
        <p className="max-w-xl surface p-6 text-sm">
          Your clients appear here once you have sent an invoice.
        </p>
      </>
    );
  }

  const shown = searchClients(sortClients(state.data), search);
  return (
    <>
      <Header search={{ value: search, onChange: setSearch }} />
      {shown.length === 0 ? (
        <p className="max-w-xl surface p-6 text-sm text-muted-foreground">No clients match.</p>
      ) : (
        <ClientCards clients={shown} />
      )}
    </>
  );
}
