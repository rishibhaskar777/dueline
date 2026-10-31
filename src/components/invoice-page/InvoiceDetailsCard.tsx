import { formatMoney } from "@/lib/money/format";
import type { InvoiceDetailResponse } from "@/types";

export function InvoiceDetailsCard({
  invoice,
  details,
}: Pick<InvoiceDetailResponse, "invoice" | "details">) {
  return (
    <section aria-labelledby="details-title" className="rounded-xl border border-line bg-white p-6">
      <h2 id="details-title" className="text-xl font-semibold">
        Details
      </h2>
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">Items on the invoice</caption>
        <thead>
          <tr className="text-left text-muted-foreground">
            <th scope="col" className="py-2 font-medium">
              Item
            </th>
            <th scope="col" className="py-2 font-medium">
              SAC
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Quantity
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Unit price
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {details.items.map((item, index) => (
            <tr key={`${item.name}-${index}`}>
              <td className="py-2">{item.name}</td>
              <td className="py-2 tabular-nums">{item.sac ?? "–"}</td>
              <td className="py-2 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(item.unitAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-4 grid gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Purpose code</dt>
          <dd>
            {invoice.purposeCode ?? "None chosen"}
            {invoice.purposeCode && (
              <span className="text-muted-foreground"> · Suggestion, confirm with your CA</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">LUT</dt>
          <dd>{details.underLut ? "Exported under a Letter of Undertaking" : "Not under LUT"}</dd>
        </div>
        {details.note && (
          <div>
            <dt className="text-muted-foreground">Note on the invoice</dt>
            <dd className="whitespace-pre-line">{details.note}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
