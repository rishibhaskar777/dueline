import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { DueLineRow } from "./due-line-layout";
import { rupeesFromPayPal } from "./invoice-status";

export interface TooltipTarget {
  row: DueLineRow;
  // Viewport coordinates: where the tooltip centres, and the edges of the row it belongs to.
  x: number;
  rowTop: number;
  rowBottom: number;
}

const WIDTH = 256;
const GAP = 4;
const MARGIN = 8;
// Room needed below the row before the tooltip is placed under it instead of above.
const HEIGHT_ESTIMATE = 176;

export function DueLineTooltip({ target }: { target: TooltipTarget }) {
  const { invoice } = target.row;
  const left = Math.max(MARGIN, Math.min(target.x - WIDTH / 2, window.innerWidth - WIDTH - MARGIN));
  const below = window.innerHeight - target.rowBottom >= HEIGHT_ESTIMATE + GAP;
  const vertical = below
    ? { top: target.rowBottom + GAP }
    : { bottom: window.innerHeight - target.rowTop + GAP };

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-40 rounded-lg border border-line bg-white p-3 text-xs shadow-lg"
      style={{ left, width: WIDTH, ...vertical }}
    >
      <p className="text-sm font-medium">{invoice.work}</p>
      <p className="text-muted-foreground">
        {invoice.number} · {invoice.client.name}
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
        <dt className="text-muted-foreground">Amount</dt>
        <dd>{formatMoney(invoice.amount)}</dd>
        <dt className="text-muted-foreground">Issued</dt>
        <dd>{formatDate(invoice.issuedOn)}</dd>
        <dt className="text-muted-foreground">Due</dt>
        <dd>{formatDate(invoice.dueOn)}</dd>
        {invoice.paidOn && (
          <>
            <dt className="text-muted-foreground">Paid</dt>
            <dd>{formatDate(invoice.paidOn)}</dd>
          </>
        )}
        {invoice.payoutInr !== null && (
          <>
            <dt className="text-muted-foreground">To your bank</dt>
            <dd>
              {formatRupees(invoice.payoutInr)}{" "}
              {rupeesFromPayPal(invoice) ? "(PayPal)" : "(estimate)"}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
