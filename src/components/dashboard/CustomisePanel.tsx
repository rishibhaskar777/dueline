"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  moveWidget,
  setWidgetVisible,
  widgetTitle,
  type Layout,
  type WidgetId,
} from "./dashboard-layout";

interface CustomisePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: Layout;
  onChange: (layout: Layout) => void;
  onReset: () => void;
}

function VisibilitySwitch({
  title,
  visible,
  onChange,
}: {
  title: string;
  visible: boolean;
  onChange: (visible: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      aria-label={`Show ${title}`}
      onClick={() => onChange(!visible)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        visible ? "border-blue bg-blue" : "border-line bg-ground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-0.5 left-0.5 size-4.5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none",
          visible && "translate-x-5",
        )}
      />
    </button>
  );
}

export function CustomisePanel({
  open,
  onOpenChange,
  layout,
  onChange,
  onReset,
}: CustomisePanelProps) {
  const move = (id: WidgetId, step: -1 | 1) => onChange(moveWidget(layout, id, step));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Customise Receivables</DialogTitle>
          <DialogDescription>
            Choose what to show and in what order. This is saved in this browser only.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-line">
          {layout.map(({ id, visible }, index) => (
            <li key={id} className="flex items-center gap-2 py-2">
              <span className="flex-1 text-sm font-medium">{widgetTitle(id)}</span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={`Move ${widgetTitle(id)} up`}
                disabled={index === 0}
                onClick={() => move(id, -1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={`Move ${widgetTitle(id)} down`}
                disabled={index === layout.length - 1}
                onClick={() => move(id, 1)}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <VisibilitySwitch
                title={widgetTitle(id)}
                visible={visible}
                onChange={(next) => onChange(setWidgetVisible(layout, id, next))}
              />
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" className="w-fit" onClick={onReset}>
          Reset to default
        </Button>
      </DialogContent>
    </Dialog>
  );
}
