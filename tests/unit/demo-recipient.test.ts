import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readDemoRecipient } from "@/components/demo/use-demo-mode";
import { signIn, signOut } from "@/lib/api-client";
import { forgetRemembered } from "@/lib/remembered";

beforeEach(forgetRemembered);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the demo recipient", () => {
  it("is asked for once, and again after locking the demo and signing in", async () => {
    const fetchSpy = vi
      .fn()
      .mockImplementation(async (path: string) =>
        path === "/api/demo/recipient"
          ? Response.json({ email: "buyer@personal.example.com" })
          : new Response(null, { status: 204 }),
      );
    vi.stubGlobal("fetch", fetchSpy);
    const recipientCalls = (): number =>
      fetchSpy.mock.calls.filter(([path]) => path === "/api/demo/recipient").length;

    await Promise.all([readDemoRecipient(), readDemoRecipient()]);
    await readDemoRecipient();
    expect(recipientCalls()).toBe(1);

    await signOut();
    await signIn("open sesame");
    await readDemoRecipient();
    expect(recipientCalls()).toBe(2);
  });

  it("is not kept when the ask fails", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ error: { code: "demo_unavailable", message: "No." } }, { status: 404 }),
      )
      .mockImplementation(async () => Response.json({ email: "buyer@personal.example.com" }));
    vi.stubGlobal("fetch", fetchSpy);

    await expect(readDemoRecipient()).rejects.toMatchObject({ code: "demo_unavailable" });
    await expect(readDemoRecipient()).resolves.toBe("buyer@personal.example.com");
  });
});
