import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  createInvoice,
  exportRegisterCsvUrl,
  getDemoRecipient,
  getInvoices,
  getClientRisk,
  getPurposeCodes,
  getReminders,
  resetDemo,
  sendInvoiceDraft,
  signIn,
  signOut,
} from "@/lib/api-client";
import { extraction } from "@/mocks/fixtures";

const unauthorized = { error: { code: "unauthorized", message: "Enter the demo password." } };

function stubBrowser(pathname: string, search = ""): { assign: ReturnType<typeof vi.fn> } {
  const location = { pathname, search, assign: vi.fn() };
  vi.stubGlobal("window", { location });
  return location;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("turns an ApiError response into an ApiClientError", async () => {
    const body = { error: { code: "paypal_error", message: "PayPal said no.", debugId: "abc123" } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body, { status: 502 })));

    const error = await getInvoices().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      status: 502,
      code: "paypal_error",
      message: "PayPal said no.",
      debugId: "abc123",
    });
  });

  it("falls back to a plain error when the response is not an ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 500 })));

    await expect(getInvoices()).rejects.toMatchObject({ status: 500, code: "unexpected_response" });
  });

  it("unwraps list responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ drafts: [] })));

    await expect(getReminders()).resolves.toEqual([]);
  });

  it("asks for a client's risk by email and, when known, name", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    await getClientRisk("a@b.example");
    await getClientRisk("a@b.example", "Okafor & Reyes");

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      "/api/clients/risk?email=a%40b.example",
      "/api/clients/risk?email=a%40b.example&name=Okafor+%26+Reyes",
    ]);
  });

  it("sends the browser to the sign-in page, keeping the page, when a call is unauthorized", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(unauthorized, { status: 401 })));
    const location = stubBrowser("/export", "?month=2026-10");

    await expect(getInvoices()).rejects.toMatchObject({ status: 401, code: "unauthorized" });

    expect(location.assign).toHaveBeenCalledWith("/demo?next=%2Fexport%3Fmonth%3D2026-10");
  });

  it("does not redirect from the sign-in page or for other errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(unauthorized, { status: 401 })));
    const onSignIn = stubBrowser("/demo");
    await expect(getInvoices()).rejects.toBeInstanceOf(ApiClientError);
    expect(onSignIn.assign).not.toHaveBeenCalled();

    const body = { error: { code: "paypal_error", message: "No." } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body, { status: 502 })));
    const elsewhere = stubBrowser("/receivables");
    await expect(getInvoices()).rejects.toBeInstanceOf(ApiClientError);
    expect(elsewhere.assign).not.toHaveBeenCalled();
  });

  it("reports a wrong password without redirecting", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(unauthorized, { status: 401 })));
    const location = stubBrowser("/demo");

    await expect(signIn("wrong")).rejects.toMatchObject({ code: "unauthorized" });

    expect(location.assign).not.toHaveBeenCalled();
  });

  it("signs in and out through the session endpoint", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await signIn("open sesame");
    await signOut();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/demo/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ password: "open sesame" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/demo/session", { method: "DELETE" });
  });

  it("resets the demo and returns what changed", async () => {
    const result = { cancelled: 2, deleted: 1, created: 7, skipped: 1, failed: 0 };
    const fetchMock = vi.fn().mockImplementation(async () => Response.json(result));
    vi.stubGlobal("fetch", fetchMock);

    expect(await resetDemo()).toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith("/api/demo/reset", { method: "POST" });
  });

  it("posts a new invoice and a retry of its send", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => Response.json({ invoice: { id: "INV2-1" }, sent: true }));
    vi.stubGlobal("fetch", fetchMock);
    const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";

    const draft = { ...extraction.draft, dueOn: "2026-10-30" };
    await createInvoice({ draft, requestId });
    await sendInvoiceDraft("INV2-1", requestId);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/invoices",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ draft, requestId }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/invoices/INV2-1/send",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ requestId }) }),
    );
  });

  it("unwraps the purpose codes and the demo buyer's address", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async (path: string) =>
          path === "/api/purpose-codes"
            ? Response.json({ codes: [{ code: "P1099", label: "Other", examples: "" }] })
            : Response.json({ email: "buyer@personal.example.com" }),
        ),
    );

    expect(await getPurposeCodes()).toEqual([{ code: "P1099", label: "Other", examples: "" }]);
    expect(await getDemoRecipient()).toBe("buyer@personal.example.com");
  });

  it("reports a missing demo buyer as an error", async () => {
    const body = { error: { code: "not_found", message: "No demo buyer is set up." } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body, { status: 404 })));
    await expect(getDemoRecipient()).rejects.toMatchObject({ status: 404, code: "not_found" });
  });

  it("builds the CSV download URL", () => {
    expect(exportRegisterCsvUrl("2026-10")).toBe("/api/export-register?month=2026-10&format=csv");
  });
});
