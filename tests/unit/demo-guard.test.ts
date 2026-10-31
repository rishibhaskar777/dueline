import { beforeEach, describe, expect, it } from "vitest";
import { assertSandboxBuyers, RecipientNotAllowedError } from "@/lib/demo-guard";
import { stubEnv } from "../support/env";

describe("assertSandboxBuyers", () => {
  beforeEach(() => stubEnv());

  it("accepts sandbox buyers, whatever the letter case", () => {
    expect(() => assertSandboxBuyers(["buyer@personal.example.com"])).not.toThrow();
    expect(() => assertSandboxBuyers(["Buyer@Personal.Example.com"])).not.toThrow();
  });

  it("refuses any other address, even next to a sandbox buyer", () => {
    expect(() => assertSandboxBuyers(["client@acme.example"])).toThrow(RecipientNotAllowedError);
    expect(() => assertSandboxBuyers(["buyer@personal.example.com", "a@b.com"])).toThrow(
      RecipientNotAllowedError,
    );
  });

  it("allows any address once demo mode is off", () => {
    stubEnv({ DEMO_MODE: "false" });
    expect(() => assertSandboxBuyers(["client@acme.example"])).not.toThrow();
  });
});
