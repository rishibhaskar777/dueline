import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  exportRegisterCsvUrl,
  getInvoices,
  getReminders,
  signIn,
  signOut,
} from "@/lib/api-client";

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

  it("builds the CSV download URL", () => {
    expect(exportRegisterCsvUrl("2026-10")).toBe("/api/export-register?month=2026-10&format=csv");
  });
});
