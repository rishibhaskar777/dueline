import { addMonths } from "@/lib/date-math";
import { formatMonth } from "@/lib/format-date";
import { monthSchema } from "@/types";

interface MonthPickerProps {
  month: string;
  currentMonth: string;
  onChange: (month: string) => void;
}

const ARROW =
  "flex size-9 items-center justify-center rounded-full bg-chip text-base font-bold transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 max-md:size-11";

export function MonthPicker({ month, currentMonth, onChange }: MonthPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="surface inline-flex items-center gap-1.5 p-1 [--surface-radius:1000px]">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onChange(addMonths(month, -1))}
          className={ARROW}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <h2
          aria-live="polite"
          className="min-w-40 px-2 text-center font-heading text-[22px] font-extrabold tracking-[-0.3px]"
        >
          {formatMonth(month)}
        </h2>
        <button
          type="button"
          aria-label="Next month"
          disabled={month >= currentMonth}
          onClick={() => onChange(addMonths(month, 1))}
          className={ARROW}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <label className="surface flex h-11 items-center gap-2 px-4 text-[15px] font-semibold [--surface-radius:1000px] focus-within:ring-2 focus-within:ring-ring">
        <span>Go to month</span>
        <input
          type="month"
          value={month}
          max={currentMonth}
          onChange={({ target }) => {
            if (monthSchema.safeParse(target.value).success && target.value <= currentMonth) {
              onChange(target.value);
            }
          }}
          className="bg-transparent text-[15px] font-medium outline-none"
        />
      </label>
    </div>
  );
}
