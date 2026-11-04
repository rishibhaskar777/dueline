import type { PrintDocument } from "@/components/print/print-invoice";

// Plain black on white with solid rules, so it reads the same on screen, on paper and in black and
// white. Colours are fixed here on purpose: the page never follows the dark theme.
const RULE = "border-b border-[#8a8a8a]";
const CELL = "px-2 py-1.5 align-top max-sm:px-1 print:py-1";

function Party({ title, lines }: { title: string; lines: string[] }) {
  return (
    <section aria-label={title}>
      <h2 className="text-[11px] font-bold tracking-wide text-[#444] uppercase">{title}</h2>
      {lines.map((line, index) => (
        <p key={line} className={index === 0 ? "font-bold" : undefined}>
          {line}
        </p>
      ))}
    </section>
  );
}

export function InvoiceDocument({ doc }: { doc: PrintDocument }) {
  const { supplier, recipient } = doc;
  const supplierLines = [
    supplier.businessName || supplier.name,
    supplier.businessName ? supplier.name : "",
    supplier.address,
    supplier.gstin && `GSTIN ${supplier.gstin}`,
    supplier.website,
  ].filter(Boolean);
  const recipientLines = [
    recipient.name,
    recipient.contactName && `Attn: ${recipient.contactName}`,
    recipient.country && `Billing country: ${recipient.country}`,
  ].filter(Boolean);

  return (
    <article
      aria-label={`Tax invoice ${doc.number}`}
      className="mx-auto w-full max-w-[210mm] bg-white p-[14mm] text-[13px] leading-snug text-[#111] max-sm:p-4 print:max-w-none print:p-0 print:text-[10pt] print:leading-tight"
    >
      <header className={`flex flex-wrap items-start justify-between gap-4 pb-3 ${RULE}`}>
        <h1 className="text-[26px] font-bold">Tax invoice</h1>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-right">
          <dt className="text-[#444]">Invoice number</dt>
          <dd className="font-bold tabular-nums">{doc.number}</dd>
          <dt className="text-[#444]">Date</dt>
          <dd className="tabular-nums">{doc.issuedOn}</dd>
          <dt className="text-[#444]">Due date</dt>
          <dd className="tabular-nums">{doc.dueOn}</dd>
        </dl>
      </header>

      <div className="grid gap-4 py-3 sm:grid-cols-2">
        <Party title="From" lines={supplierLines} />
        <Party title="Bill to" lines={recipientLines} />
      </div>

      <dl className={`grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 pb-3 ${RULE}`}>
        <dt className="text-[#444]">Place of supply</dt>
        <dd>{doc.placeOfSupply}</dd>
        <dt className="text-[#444]">Tax payable on reverse charge</dt>
        <dd>{doc.reverseCharge}</dd>
        {doc.purposeCode && (
          <>
            <dt className="text-[#444]">RBI purpose code</dt>
            <dd>{doc.purposeCode}</dd>
          </>
        )}
      </dl>

      <table className="mt-3 w-full border-collapse text-left max-sm:text-[12px]">
        <caption className="sr-only">Items on invoice {doc.number}</caption>
        <thead>
          <tr className="border-y border-[#111] text-[11px] tracking-wide uppercase">
            <th scope="col" className={CELL}>
              Description
            </th>
            <th scope="col" className={CELL}>
              SAC
            </th>
            <th scope="col" className={`${CELL} text-right`}>
              Qty
            </th>
            <th scope="col" className={`${CELL} text-right`}>
              Unit price
            </th>
            <th scope="col" className={`${CELL} text-right`}>
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {doc.rows.map((row, index) => (
            <tr key={`${row.description}-${index}`} className={`${RULE} print:break-inside-avoid`}>
              <td className={`${CELL} [overflow-wrap:anywhere]`}>{row.description}</td>
              <td className={`${CELL} tabular-nums`}>{row.sac}</td>
              <td className={`${CELL} text-right tabular-nums`}>{row.quantity}</td>
              <td className={`${CELL} text-right tabular-nums`}>{row.unitPrice}</td>
              <td className={`${CELL} text-right tabular-nums`}>{row.amount}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {doc.discount && (
            <tr>
              <th scope="row" colSpan={4} className={`${CELL} text-right font-normal`}>
                Early-payment discount
              </th>
              <td className={`${CELL} text-right tabular-nums`}>− {doc.discount}</td>
            </tr>
          )}
          <tr className="border-t border-[#111] font-bold">
            <th scope="row" colSpan={4} className={`${CELL} text-right`}>
              Total in invoice currency
            </th>
            <td className={`${CELL} text-right tabular-nums`}>{doc.total}</td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-4 font-bold">{doc.endorsement}</p>

      {doc.payLink && (
        <p className="mt-3 [overflow-wrap:anywhere]">
          Pay online with PayPal: <span className="tabular-nums">{doc.payLink}</span>
        </p>
      )}

      <div className="mt-10 w-64 print:mt-6 border-t border-[#111] pt-1">
        <p>Signature of the supplier</p>
        {supplier.name && <p className="font-bold">{supplier.name}</p>}
      </div>
    </article>
  );
}
