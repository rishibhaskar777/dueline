import { Button } from "@/components/ui/button";

export const GRID_EXPORT_HINT =
  "Exports this table as shown. For your CA, use “Download CSV for your CA” above, which has more columns.";

// Sits in the header of a grid: the button that saves what the grid shows, and what it is for.
export function GridExport({ id, onExport }: { id: string; onExport: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p id={id} className="max-w-md text-[13px] text-muted-foreground">
        {GRID_EXPORT_HINT}
      </p>
      <Button type="button" variant="outline" aria-describedby={id} onClick={onExport}>
        Export grid as CSV
      </Button>
    </div>
  );
}
