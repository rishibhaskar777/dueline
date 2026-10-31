import { vi } from "vitest";

// connection() only works inside a Next.js request, which a direct call to a route handler is not.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
