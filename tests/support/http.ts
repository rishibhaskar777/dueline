import { vi, type MockInstance } from "vitest";

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

export const TOKEN_PATH = "/v1/oauth2/token";

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

// Answers the OAuth request with a token and hands every other request to `handler`.
export function mockPayPal(handler: Handler): MockInstance<typeof fetch> {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.pathname === TOKEN_PATH) {
      return jsonResponse({ access_token: "token-1", expires_in: 32400 });
    }
    return handler(url, init);
  });
}

export function callsTo(spy: MockInstance<typeof fetch>, pathname: string): number {
  return spy.mock.calls.filter(([input]) => new URL(String(input)).pathname === pathname).length;
}
