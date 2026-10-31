"use client";

import { Download } from "lucide-react";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { buttonVariants } from "@/components/ui/button";
import { exportRegisterCsvUrl, gstr1CsvUrl } from "@/lib/api-client";
import { ESTIMATE_LABEL } from "@/lib/export/tax-notes";
import { financialYearOf } from "@/lib/date-math";
import { AnnualSummaryDialog } from "./AnnualSummaryDialog";
import { MonthPicker } from "./MonthPicker";
import { RecordedOutside } from "./RecordedOutside";
import { FIRA_EXPLAINER, FIRA_GUIDE_URL } from "./register-text";
import { RegisterSummary } from "./RegisterSummary";
import { EmptyRegister, RegisterSkeleton } from "./RegisterStates";
import { RegisterTable } from "./RegisterTable";
import { useExportRegister, type RegisterState } from "./use-export-register";

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
  if (register.rows.length === 0) {
    return (
      <>
        <EmptyRegister month={month} />
        <RecordedOutside numbers={register.recordedOutsidePayPal} />
      </>
    );
  }

  return (
    <>
      <RegisterSummary register={register} />
      <RegisterTable rows={register.rows} />
      <RecordedOutside numbers={register.recordedOutsidePayPal} />
    </>
  );
}

export function ExportRegisterView() {
  const { month, currentMonth, state, setMonth, retry } = useExportRegister();

  if (!month || !currentMonth) {
    return state.kind === "error" ? (
      <LoadFailure title="Couldn't load the export register" error={state.error} onRetry={retry} />
    ) : (
      <RegisterSkeleton />
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <MonthPicker month={month} currentMonth={currentMonth} onChange={setMonth} />
        <div className="flex flex-wrap gap-3">
          <a href={exportRegisterCsvUrl(month)} className={buttonVariants({ size: "lg" })}>
            <Download aria-hidden="true" />
            Download CSV for your CA
          </a>
          <a
            href={gstr1CsvUrl(month)}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <Download aria-hidden="true" />
            GSTR-1 exports (CSV)
          </a>
          <AnnualSummaryDialog fy={financialYearOf(month)} />
        </div>
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        {FIRA_EXPLAINER}{" "}
        <a
          href={FIRA_GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue underline underline-offset-2"
        >
          Learn more
        </a>
      </p>
      <p className="max-w-2xl text-sm text-muted-foreground">
        GSTR-1 exports list the invoices issued in this month, valued at the ECB rate of the invoice
        date; the official rule uses the RBI reference rate. {ESTIMATE_LABEL}
      </p>
      <RegisterBody month={month} state={state} onRetry={retry} />
    </div>
  );
}
