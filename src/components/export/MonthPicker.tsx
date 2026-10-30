import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMonths } from "@/lib/date-math";
import { formatMonth } from "@/lib/format-date";
import { monthSchema } from "@/types";

interface MonthPickerProps {
  month: string;
  currentMonth: string;
  onChange: (month: string) => void;
}

export function MonthPicker({ month, currentMonth, onChange }: MonthPickerProps) {
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="Previous month"
          onClick={() => onChange(addMonths(month, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <h2 aria-live="polite" className="min-w-40 text-center text-xl font-semibold">
          {formatMonth(month)}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="Next month"
          disabled={month >= currentMonth}
          onClick={() => onChange(addMonths(month, 1))}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="register-month">Go to month</Label>
        <Input
          id="register-month"
          type="month"
          value={month}
          max={currentMonth}
          onChange={({ target }) => {
            if (monthSchema.safeParse(target.value).success && target.value <= currentMonth) {
              onChange(target.value);
            }
          }}
          className="w-44"
        />
      </div>
    </div>
  );
}
