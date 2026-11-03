import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  cancelInvoice,
  createInvoice,
  exportRegisterCsvUrl,
  getDemoRecipient,
  getInvoices,
  getClientDetail,
  getClientRisk,
  getInvoiceDetail,
  getPurposeCodes,
  getReminders,
  recordPayment,
  resetDemo,
  saveClientNotes,
  sendInvoiceDraft,
  signIn,
  signOut,
} from "@/lib/api-client";
import { recall, remember } from "@/lib/remembered";
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

  it("returns the drafts with how many reminders PayPal still allows today", async () => {
    const body = { drafts: [], remindersLeftToday: 1 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));

    await expect(getReminders()).resolves.toEqual(body);
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

  it("reads and saves a client under by-key, so a client called risk is not the radar", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => Response.json({ notes: "Pays late." }));
    vi.stubGlobal("fetch", fetchMock);

    await getClientDetail("risk");
    await expect(saveClientNotes("a/b", "Pays late.")).resolves.toBe("Pays late.");

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      "/api/clients/by-key/risk",
      "/api/clients/by-key/a%2Fb/notes",
    ]);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "PUT" });
  });

  it("posts a cancellation and a recorded payment to the invoice's own address", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";

    await getInvoiceDetail("INV2/1");
    await cancelInvoice("INV2/1", { requestId, notifyClient: false });
    await recordPayment("INV2/1", { requestId, method: "OTHER", paidOn: "2026-11-03" });

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      "/api/invoices/INV2%2F1",
      "/api/invoices/INV2%2F1/cancel",
      "/api/invoices/INV2%2F1/record-payment",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ requestId, notifyClient: false });
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

describe("reads that arrive together", () => {
  const invoices = { invoices: [], totals: {}, loadedAt: null };

  it("share one request while it is on its way, and ask again afterwards", async () => {
    const fetchSpy = vi.fn().mockImplementation(async () => Response.json(invoices));
    vi.stubGlobal("fetch", fetchSpy);

    const [first, second] = await Promise.all([getInvoices(), getInvoices()]);
    expect(first).toBe(second);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await getInvoices();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("keep different addresses apart", async () => {
    const fetchSpy = vi.fn().mockImplementation(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchSpy);

    await Promise.all([getClientRisk("a@example.com"), getClientRisk("b@example.com")]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("all see the same failure, and the next read tries again", async () => {
    const fetchSpy = vi
      .fn()
      .mockImplementationOnce(async () =>
        Response.json({ error: { code: "paypal_error", message: "No." } }, { status: 502 }),
      )
      .mockImplementation(async () => Response.json(invoices));
    vi.stubGlobal("fetch", fetchSpy);

    const results = await Promise.allSettled([getInvoices(), getInvoices()]);
    expect(results.map(({ status }) => status)).toEqual(["rejected", "rejected"]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await expect(getInvoices()).resolves.toEqual(invoices);
  });

  it("never share a write", async () => {
    const fetchSpy = vi.fn().mockImplementation(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchSpy);

    await Promise.all([resetDemo(), resetDemo()]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("after a write, a sign-in or a sign-out", () => {
  it("forgets every remembered screen, whether the write worked or not", async () => {
    remember("receivables", { invoices: 1 });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => new Response(null, { status: 204 })),
    );
    await signOut();
    expect(recall("receivables")).toBeUndefined();

    remember("nudges", { drafts: 1 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(unauthorized, { status: 401 })));
    stubBrowser("/demo");
    await signIn("wrong").catch(() => undefined);
    expect(recall("nudges")).toBeUndefined();
  });

  it("keeps remembered screens when only reading", async () => {
    remember("receivables", { invoices: 1 });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => Response.json({})),
    );
    await getInvoices();
    expect(recall("receivables")).toEqual({ invoices: 1 });
  });

  it("sends the first read after a sign-out to the server instead of a read still on its way", async () => {
    let release: (response: Response) => void = () => undefined;
    const fetchSpy = vi
      .fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (release = resolve)))
      .mockImplementation(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchSpy);

    const before = getInvoices();
    await signOut();
    await signIn("open sesame");
    fetchSpy.mockImplementation(async () => Response.json({ invoices: ["second session"] }));
    const after = getInvoices();
    release(Response.json({ invoices: ["first session"] }));

    expect(await after).toEqual({ invoices: ["second session"] });
    expect(await before).toEqual({ invoices: ["first session"] });
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });
});

describe("a request after a cold start", () => {
  it("reads again once when the first try gets no answer, and answers from the second", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue(Response.json({ invoices: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getInvoices()).resolves.toEqual({ invoices: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("says the app could not be reached, never the browser's raw message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(getInvoices()).rejects.toMatchObject({
      code: "network_error",
      message: "Could not reach Dueline. Check your connection and try again.",
    });
  });

  it("does not send a write twice", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resetDemo()).rejects.toMatchObject({ code: "network_error" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
