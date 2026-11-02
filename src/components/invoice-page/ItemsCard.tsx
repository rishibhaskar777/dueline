import { formatMoney } from "@/lib/money/format";
import type { InvoiceDetailResponse } from "@/types";

export function ItemsCard({ details }: Pick<InvoiceDetailResponse, "details">) {
  return (
    <section
      aria-labelledby="items-title"
      className="surface p-7 [--h2-size:24px] [--surface-radius:24px]"
    >
      <h2 id="items-title">Items</h2>
      <div className="mt-3.5 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-base">
          <caption className="sr-only">Items on the invoice</caption>
          <thead>
            <tr className="text-left text-sm text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Item
              </th>
              <th scope="col" className="w-28 py-2 pr-3 font-semibold">
                SAC
              </th>
              <th scope="col" className="w-20 py-2 pr-3 text-right font-semibold">
                Qty
              </th>
              <th scope="col" className="w-32 py-2 text-right font-semibold">
                Unit price
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line border-t border-line">
            {details.items.map((item, index) => (
              <tr key={`${item.name}-${index}`}>
                <td className="py-3.5 pr-3 font-bold">{item.name}</td>
                <td className="py-3.5 pr-3 tabular-nums">{item.sac ?? "–"}</td>
                <td className="py-3.5 pr-3 text-right tabular-nums">{item.quantity}</td>
                <td className="py-3.5 text-right tabular-nums">{formatMoney(item.unitAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {details.note && (
        <div className="mt-3.5 rounded-2xl bg-inner px-[18px] py-4 text-sm leading-[1.6] text-muted-foreground">
          <strong className="text-foreground">Note on the invoice</strong>
          <p className="whitespace-pre-line">{details.note}</p>
        </div>
      )}
    </section>
  );
}
