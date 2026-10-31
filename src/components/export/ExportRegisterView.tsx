"use client";

import { Download } from "lucide-react";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { buttonVariants } from "@/components/ui/button";
import { exportRegisterCsvUrl } from "@/lib/api-client";
import { MonthPicker } from "./MonthPicker";
import { RecordedOutside } from "./RecordedOutside";
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
        <a href={exportRegisterCsvUrl(month)} className={buttonVariants({ size: "lg" })}>
          <Download aria-hidden="true" />
          Download CSV for your CA
        </a>
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        PayPal emails a FIRA for the money it sends to your bank. Match each line here with it.
        Purpose codes are suggestions; confirm them with your CA.
      </p>
      <RegisterBody month={month} state={state} onRetry={retry} />
    </div>
  );
}
