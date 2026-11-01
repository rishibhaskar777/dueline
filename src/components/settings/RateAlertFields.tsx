"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currencySchema } from "@/types";
import { MAX_RATE_ALERTS, newAlertRow, type AlertRow } from "./automation-form";

const CURRENCY_ITEMS = currencySchema.options.map((code) => ({ value: code, label: code }));
const DIRECTION_ITEMS = [
  { value: "above", label: "above" },
  { value: "below", label: "below" },
] as const;

interface RateAlertFieldsProps {
  alerts: AlertRow[];
  onChange: (alerts: AlertRow[]) => void;
}

export function RateAlertFields({ alerts, onChange }: RateAlertFieldsProps) {
  const update = (key: string, changes: Partial<AlertRow>) =>
    onChange(alerts.map((row) => (row.key === key ? { ...row, ...changes } : row)));

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">Rate alerts</legend>
      <p className="text-sm text-muted-foreground">
        Mark a rate when it crosses a line you choose, for example USD above ₹96.
      </p>
      {alerts.map((row, index) => (
        <div key={row.key} className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1.5">
            <Label id={`alert-currency-${row.key}`}>Currency {index + 1}</Label>
            <Select
              value={row.currency}
              items={CURRENCY_ITEMS}
              onValueChange={(value) => value && update(row.key, { currency: value })}
            >
              <SelectTrigger aria-labelledby={`alert-currency-${row.key}`} className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label id={`alert-direction-${row.key}`}>When it is</Label>
            <Select
              value={row.direction}
              items={DIRECTION_ITEMS}
              onValueChange={(value) => value && update(row.key, { direction: value })}
            >
              <SelectTrigger aria-labelledby={`alert-direction-${row.key}`} className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTION_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`alert-threshold-${row.key}`}>Rate (₹)</Label>
            <Input
              id={`alert-threshold-${row.key}`}
              inputMode="decimal"
              autoComplete="off"
              value={row.threshold}
              onChange={(event) => update(row.key, { threshold: event.target.value })}
              className="w-28 tabular-nums"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove alert ${index + 1}`}
            onClick={() => onChange(alerts.filter((other) => other.key !== row.key))}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      {alerts.length < MAX_RATE_ALERTS && (
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => onChange([...alerts, newAlertRow()])}
        >
          <Plus aria-hidden data-icon="inline-start" />
          Add alert
        </Button>
      )}
    </fieldset>
  );
}
