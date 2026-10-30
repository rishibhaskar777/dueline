import { describe, expect, it } from "vitest";
import { GET as getRisk } from "@/app/api/clients/risk/route";
import { POST as resetDemo } from "@/app/api/demo/reset/route";
import { POST as extract } from "@/app/api/invoices/extract/route";
import { POST as draftReminder } from "@/app/api/reminders/draft/route";
import { GET as getReminders } from "@/app/api/reminders/route";
import { POST as sendReminder } from "@/app/api/reminders/send/route";
import { STUB_HEADER } from "@/app/api/_lib/stub";
import { invoices } from "@/mocks/fixtures";

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
    expectStub(await getReminders());
    expectStub(await getRisk(get("/api/clients/risk?email=mike@haldencoffee.example")));
  });

  it("answers every POST route", async () => {
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
  });

  it("returns 204 for the demo reset", async () => {
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
});
