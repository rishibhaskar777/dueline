"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { InvoiceList } from "@/components/clients/InvoiceList";
import { LanguageSuggestion } from "@/components/shared/LanguageSuggestion";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { TotalCard } from "@/components/shared/TotalCard";
import { useLoad } from "@/components/shared/use-load";
import { useToday } from "@/components/shared/use-today";
import { buttonVariants } from "@/components/ui/button";
import { getClientDetail } from "@/lib/api-client";
import { countryName } from "@/lib/countries";
import { formatDays, wholeDays } from "@/lib/format-days";
import { formatRupees } from "@/lib/money/format";
import { displayEmail } from "@/lib/sandbox-buyer";
import { cn } from "@/lib/utils";
import type { ReminderLanguage } from "@/types";
import { ClientAvatar } from "./ClientAvatar";
import { ClientNotes } from "./ClientNotes";
import { ClientRepeats } from "./ClientRepeats";
import { MergeClient } from "./MergeClient";
import { MergedClients } from "./MergedClients";
import { ReasonStrip } from "./ReasonStrip";
import { ReminderLanguageCard } from "./ReminderLanguageCard";

function NotFound() {
  return (
    <div className="max-w-xl surface p-6">
      <h1 className="text-xl font-semibold">We couldn&apos;t find that client</h1>
      <p className="mt-2 text-sm">
        They may have no invoices left, or the address may be wrong.{" "}
        <Link href="/clients" className="text-blue underline underline-offset-2">
          See all clients
        </Link>
      </p>
    </div>
  );
}

export function ClientScreen({ clientKey }: { clientKey: string }) {
  const load = useCallback(() => getClientDetail(clientKey), [clientKey]);
  const { state, reload } = useLoad(load);
  const today = useToday();
  // The language the freelancer picked from the suggestion, until the page is loaded again.
  const [picked, setPicked] = useState<ReminderLanguage | null>(null);

  if (state.kind === "loading") return <SkeletonBlock className="h-96" />;
  if (state.kind === "error") {
    return state.error.notFound ? (
      <NotFound />
    ) : (
      <LoadFailure title="Couldn't load this client" error={state.error} onRetry={reload} />
    );
  }

  const { client, invoices, risk, notes, merged, languageSuggestion } = state.data;
  const language = picked ?? state.data.language;
  return (
    <div className="grid gap-5">
      <Link href="/clients" className="w-fit text-[15px] font-semibold text-link underline">
        <span aria-hidden="true">← </span>All clients
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-[18px] gap-y-3">
          <ClientAvatar name={client.name} level={client.riskLevel} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-4xl font-extrabold tracking-[-1.2px] break-words md:text-[44px]">
                {client.name}
              </h1>
              {client.riskLevel && <RiskBadge level={client.riskLevel} />}
            </div>
            <p
              title={client.email}
              className="mt-1.5 max-w-[860px] text-base [overflow-wrap:anywhere] text-muted-foreground"
            >
              {[
                displayEmail(client.email),
                countryName(client.country),
                client.paySpeed &&
                  `pays in ${formatDays(client.paySpeed.averageDays)} on average, ${client.paySpeed.onTimePercent}% on time`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <Link
          href={`/invoices/new?client=${encodeURIComponent(client.name)}`}
          className={cn(buttonVariants({ size: "lg" }), "px-[22px] font-bold max-sm:w-full")}
        >
          <span aria-hidden="true">+ </span>New invoice for this client
        </Link>
      </header>
      <ReasonStrip level={client.riskLevel} risk={risk} />
      {languageSuggestion && picked === null && (
        <LanguageSuggestion
          clientKey={client.key}
          clientName={client.name}
          country={client.country}
          suggestion={languageSuggestion}
          onChosen={setPicked}
        />
      )}
      <dl aria-label="Client totals" className="grid gap-4 lg:grid-cols-3">
        <TotalCard
          label="Billed"
          value={formatRupees(client.billedInr)}
          note={`Across ${client.invoices} ${client.invoices === 1 ? "invoice" : "invoices"}`}
        />
        <TotalCard
          label="Outstanding"
          value={formatRupees(client.outstandingInr)}
          tone={client.outstandingInr > 0 ? "late" : undefined}
          note="Estimated after fees"
        />
        <TotalCard
          label="Average days late"
          value={client.averageDaysLate > 0 ? String(wholeDays(client.averageDaysLate)) : "–"}
          note="On invoices paid late or overdue"
        />
      </dl>
      <InvoiceList invoices={invoices} today={today} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ReminderLanguageCard key={language} clientKey={client.key} initial={language} />
        <ClientRepeats clientKey={client.key} />
      </div>
      <ClientNotes clientKey={client.key} initial={notes} />
      <MergedClients
        clientKey={client.key}
        clientName={client.name}
        merged={merged}
        onChanged={reload}
      />
      <MergeClient client={client} hasMerged={merged.length > 0} />
    </div>
  );
}
