"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { Button, buttonVariants } from "@/components/ui/button";
import { exportRegisterCsvUrl, gstr1CsvUrl } from "@/lib/api-client";
import { formatMonth } from "@/lib/format-date";
import { ESTIMATE_LABEL } from "@/lib/export/tax-notes";
import { financialYearOf } from "@/lib/date-math";
import { cn } from "@/lib/utils";
import { AnnualSummaryDialog } from "./AnnualSummaryDialog";
import { MonthPicker } from "./MonthPicker";
import { BankTransfers } from "./BankTransfers";
import { FIRA_EXPLAINER, FIRA_GUIDE_URL } from "./register-text";
import { RegisterSummary } from "./RegisterSummary";
import { EmptyRegister, RegisterSkeleton } from "./RegisterStates";
import { RegisterTable } from "./RegisterTable";
import { useExportRegister, type RegisterState } from "./use-export-register";

const INTRO =
  "Paid invoices with purpose codes, ready to match PayPal's FIRA and your bank's FIRC.";
const PILL = "px-5 font-bold";

function FiraStrip() {
  return (
    <p className="surface px-5 py-4 text-[15px] leading-relaxed text-muted-foreground [--surface-radius:20px]">
      {FIRA_EXPLAINER}{" "}
      <a
        href={FIRA_GUIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-link underline underline-offset-2"
      >
        Learn more
      </a>
    </p>
  );
}

interface RegisterBodyProps {
  month: string;
  state: RegisterState;
  onRetry: () => void;
}

function RegisterBody({ month, state, onRetry }: RegisterBodyProps) {
  if (state.kind === "loading") return <RegisterSkeleton />;
  if (state.kind === "error") {
    return (
      <LoadFailure
        title="Couldn't load the export register"
        error={state.error}
        onRetry={onRetry}
      />
    );
  }
  const { register } = state;
  if (register.rows.length === 0 && register.outsideRows.length === 0) {
    return (
      <>
        <EmptyRegister month={month} />
        <FiraStrip />
      </>
    );
  }

  return (
    <>
      <RegisterSummary register={register} />
      <FiraStrip />
      {register.rows.length > 0 && <RegisterTable rows={register.rows} month={register.month} />}
      <BankTransfers rows={register.outsideRows} month={register.month} />
    </>
  );
}

export function ExportRegisterView({ initialMonth }: { initialMonth: string | null }) {
  const { month, currentMonth, state, note, setMonth, retry } = useExportRegister(initialMonth);
  const noRows =
    state.kind === "ready" &&
    state.register.rows.length === 0 &&
    state.register.outsideRows.length === 0;

  if (!month || !currentMonth) {
    return (
      <>
        <PageHeader title="Export register" intro={INTRO} />
        {state.kind === "error" ? (
          <LoadFailure
            title="Couldn't load the export register"
            error={state.error}
            onRetry={retry}
          />
        ) : (
          <RegisterSkeleton />
        )}
      </>
    );
  }

  const actions = (
    <div className="flex flex-wrap gap-2.5 max-md:w-full max-md:[&>*]:flex-auto">
      <AnnualSummaryDialog fy={financialYearOf(month)} />
      <a
        href={gstr1CsvUrl(month)}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), PILL)}
      >
        GSTR-1 rows (CSV)
      </a>
      {noRows ? (
        <Button type="button" size="lg" disabled aria-describedby="csv-reason" className={PILL}>
          Download CSV for your CA
        </Button>
      ) : (
        <a
          href={exportRegisterCsvUrl(month)}
          className={cn(buttonVariants({ size: "lg" }), PILL, "px-[22px]")}
        >
          Download CSV for your CA
        </a>
      )}
    </div>
  );

  return (
    <>
      <PageHeader title="Export register" intro={INTRO} actions={actions} />
      <div className="grid gap-[18px]">
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker month={month} currentMonth={currentMonth} onChange={setMonth} />
          {note && (
            <p
              role="status"
              className="rounded-full bg-tint-amber px-4 py-2.5 text-[15px] font-semibold text-due-soon"
            >
              {note}
            </p>
          )}
        </div>
        {noRows && (
          <p id="csv-reason" className="max-w-2xl text-sm text-muted-foreground">
            The CSV for your CA is off because no invoices were paid in {formatMonth(month)}.
          </p>
        )}
        <RegisterBody month={month} state={state} onRetry={retry} />
        <p className="max-w-3xl text-[13px] text-muted-foreground">
          GSTR-1 rows list the invoices issued in this month, valued at the ECB rate of the invoice
          date; the official rule uses the RBI reference rate. {ESTIMATE_LABEL}
        </p>
      </div>
    </>
  );
}
