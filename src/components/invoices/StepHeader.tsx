import { cn } from "@/lib/utils";
import { STEP_LABELS, stepHeader, type NewInvoiceState } from "./step-header";

// The step pill shows progress; it is not a control. The heading below it is the page's h1.
export function StepHeader({ state }: { state: Exclude<NewInvoiceState, "sent"> }) {
  const model = stepHeader(state);
  if (!model) return null;
  return (
    <header className="grid justify-items-start gap-4">
      <ol aria-label="Steps" className="glass-track inline-flex gap-0.5 rounded-full p-1">
        {STEP_LABELS.map((label, index) => {
          const current = index + 1 === model.current;
          return (
            <li
              key={label}
              aria-current={current ? "step" : undefined}
              className={cn(
                "rounded-full px-3 py-2.5 text-sm whitespace-nowrap sm:px-[18px] sm:text-base",
                current
                  ? "glass-indicator font-bold text-white"
                  : "font-semibold text-muted-foreground",
              )}
            >
              {label}
            </li>
          );
        })}
      </ol>
      <h1
        id="new-invoice-title"
        className={cn(
          "font-heading font-extrabold",
          model.intro
            ? "text-4xl leading-[1.05] tracking-[-1.4px] md:text-[52px]"
            : "text-4xl tracking-[-1.2px] md:text-[44px]",
        )}
      >
        {model.heading}
      </h1>
      {model.intro && <p className="max-w-[640px] text-lg text-muted-foreground">{model.intro}</p>}
    </header>
  );
}
