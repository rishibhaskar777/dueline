import { describe, expect, it } from "vitest";
import { clientHref } from "@/components/clients/client-href";

describe("clientHref", () => {
  it("puts the key under by-key", () => {
    expect(clientHref("okafor-reyes")).toBe("/clients/by-key/okafor-reyes");
  });

  it("keeps a key that matches a fixed route under by-key", () => {
    expect(clientHref("risk")).toBe("/clients/by-key/risk");
  });

  it("encodes characters that are not URL-safe", () => {
    expect(clientHref("a/b c")).toBe("/clients/by-key/a%2Fb%20c");
  });
});
