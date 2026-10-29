import { describe, expect, it } from "vitest";
import { GET as getActivity } from "@/app/api/activity/route";
import { GET as getRisk } from "@/app/api/clients/risk/route";
import { POST as resetDemo } from "@/app/api/demo/reset/route";
import { GET as getExportRegister } from "@/app/api/export-register/route";
import { POST as extract } from "@/app/api/invoices/extract/route";
import { POST as sendInvoice } from "@/app/api/invoices/[id]/send/route";
import { POST as createInvoice } from "@/app/api/invoices/route";
import { POST as estimate } from "@/app/api/payout-estimate/route";
import { GET as getPurposeCodes } from "@/app/api/purpose-codes/route";
import { POST as draftReminder } from "@/app/api/reminders/draft/route";
import { GET as getReminders } from "@/app/api/reminders/route";
import { POST as sendReminder } from "@/app/api/reminders/send/route";
import { GET as getSettings, PUT as putSettings } from "@/app/api/settings/route";
import { POST as webhook } from "@/app/api/webhooks/paypal/route";
import { STUB_HEADER } from "@/app/api/_lib/stub";
import { extraction, invoices, settings } from "@/mocks/fixtures";

const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";
const origin = "http://localhost:3000";

function json(method: string, path: string, body: unknown): Request {
  return new Request(`${origin}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function get(path: string): Request {
  return new Request(`${origin}${path}`);
}

function expectStub(response: Response, status = 200): void {
  expect(response.status).toBe(status);
  expect(response.headers.get(STUB_HEADER)).toBe("true");
}

describe("stub routes", () => {
  it("answers every GET route", async () => {
    expectStub(await getPurposeCodes());
    expectStub(await getReminders());
    expectStub(await getActivity());
    expectStub(await getSettings());
    expectStub(await getRisk(get("/api/clients/risk?email=mike@haldencoffee.example")));
    expectStub(await getExportRegister(get("/api/export-register?month=2026-10")));
  });

  it("answers every POST and PUT route", async () => {
    expectStub(await extract(json("POST", "/api/invoices/extract", { chat: "hello" })));
    expectStub(
      await estimate(
        json("POST", "/api/payout-estimate", { amount: { currency: "USD", value: "450.00" } }),
      ),
    );
    expectStub(
      await createInvoice(json("POST", "/api/invoices", { draft: extraction.draft, requestId })),
    );
    expectStub(
      await draftReminder(
        json("POST", "/api/reminders/draft", { invoiceId: invoices[1].id, tone: "final" }),
      ),
    );
    expectStub(
      await sendReminder(
        json("POST", "/api/reminders/send", {
          invoiceId: invoices[1].id,
          subject: "Reminder",
          message: "Please pay.",
          requestId,
        }),
      ),
    );
    expectStub(await putSettings(json("PUT", "/api/settings", settings)));
  });

  it("sends a known draft and reports an unknown one", async () => {
    const request = () => json("POST", "/api/invoices/x/send", { requestId });
    const known = await sendInvoice(request(), {
      params: Promise.resolve({ id: invoices[0].id }),
    });
    expectStub(known);

    const unknown = await sendInvoice(request(), { params: Promise.resolve({ id: "missing" }) });
    expect(unknown.status).toBe(404);
  });

  it("returns 204 for the webhook and the demo reset", async () => {
    expectStub(await webhook(), 204);
    expectStub(await resetDemo(), 204);
  });

  it("returns 400 invalid_request naming the failing field", async () => {
    const response = await extract(json("POST", "/api/invoices/extract", { chat: "" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_request");
    expect(body.error.message).toContain("chat");
  });

  it("returns 400 for a body that is not JSON", async () => {
    const request = new Request(`${origin}/api/invoices/extract`, { method: "POST", body: "nope" });
    expect((await extract(request)).status).toBe(400);
  });

  it("returns 400 for a bad export month", async () => {
    const response = await getExportRegister(get("/api/export-register?month=October"));
    expect(response.status).toBe(400);
  });

  it("returns the export register as a CSV attachment", async () => {
    const response = await getExportRegister(get("/api/export-register?month=2026-10&format=csv"));
    expectStub(response);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="dueline-export-2026-10.csv"',
    );
    const lines = (await response.text()).trim().split("\n");
    expect(lines[0]).toBe(
      "Invoice,Client,Country,Paid on,Currency,Amount,INR received,INR source,Purpose code",
    );
    expect(lines).toHaveLength(3);
  });
});
