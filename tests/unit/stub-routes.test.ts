import { describe, expect, it } from "vitest";
import { POST as resetDemo } from "@/app/api/demo/reset/route";
import { POST as extract } from "@/app/api/invoices/extract/route";
import { STUB_HEADER } from "@/app/api/_lib/stub";

const origin = "http://localhost:3000";

function json(method: string, path: string, body: unknown): Request {
  return new Request(`${origin}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function expectStub(response: Response, status = 200): void {
  expect(response.status).toBe(status);
  expect(response.headers.get(STUB_HEADER)).toBe("true");
}

describe("stub routes", () => {
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
