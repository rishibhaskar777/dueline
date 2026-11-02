import { describe, expect, it } from "vitest";
import { bankNote, invoicesPaid, paypalFiraNote } from "@/components/export/register-totals";
import { exportRegister } from "@/mocks/fixtures";
import type { ExportOutsideRow } from "@/types";

function bankRow(invoiceId: string, bankReference: string | null): ExportOutsideRow {
  const { rows } = exportRegister;
  const { fee, net, transactionId, ...shared } = rows[0];
  void fee;
  void net;
  void transactionId;
  return { ...shared, invoiceId, inrSource: "estimate", bankReference };
}

describe("register totals", () => {
  it("counts the invoices of both kinds", () => {
    const register = {
      ...exportRegister,
      outsideRows: [bankRow("a", null), bankRow("b", "FIRC/1")],
    };
    expect(invoicesPaid(register)).toBe(4);
  });

  it("says how many payments are on PayPal's FIRA", () => {
    expect(paypalFiraNote(exportRegister)).toBe("2 payments");
    expect(paypalFiraNote({ ...exportRegister, rows: exportRegister.rows.slice(0, 1) })).toBe(
      "1 payment",
    );
  });

  it("counts the bank transfers and the FIRC numbers added", () => {
    const register = {
      ...exportRegister,
      outsideRows: [bankRow("a", null), bankRow("b", "FIRC/1"), bankRow("c", "FIRC/2")],
    };
    expect(bankNote(register)).toBe("3 payments · 2 FIRC added");
  });

  it("reads 0 FIRC added when none has been typed in", () => {
    expect(bankNote({ ...exportRegister, outsideRows: [bankRow("a", null)] })).toBe(
      "1 payment · 0 FIRC added",
    );
  });
});
