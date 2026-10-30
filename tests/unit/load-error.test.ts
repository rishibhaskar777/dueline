import { describe, expect, it } from "vitest";
import { toLoadError } from "@/components/shared/load-error";
import { ApiClientError } from "@/lib/api-client";

describe("toLoadError", () => {
  it("keeps the message and PayPal debug ID of an API error", () => {
    const error = new ApiClientError(502, "paypal_error", "PayPal said no.", "abc123");
    expect(toLoadError(error)).toEqual({ message: "PayPal said no.", debugId: "abc123" });
  });

  it("uses the message of any other error, without a debug ID", () => {
    expect(toLoadError(new Error("offline"))).toEqual({ message: "offline" });
  });

  it("gives a plain message for something that is not an error", () => {
    expect(toLoadError("boom").message).toBe("Could not load your data.");
  });
});
