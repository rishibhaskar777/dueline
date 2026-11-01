import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

async function headersOnEveryPath(): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? [];
  expect(rules).toHaveLength(1);
  expect(rules[0].source).toBe("/:path*");
  return Object.fromEntries(rules[0].headers.map(({ key, value }) => [key, value]));
}

function directivesOf(policy: string): Map<string, string[]> {
  return new Map(
    policy.split(";").map((directive) => {
      const [name, ...sources] = directive.trim().split(/\s+/);
      return [name, sources];
    }),
  );
}

describe("next.config", () => {
  it("hides the framework header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("sends the security headers on every path", async () => {
    const headers = await headersOnEveryPath();
    delete headers["Content-Security-Policy"];
    expect(headers).toEqual({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    });
  });
});

describe("Content-Security-Policy", () => {
  it("restricts every kind of resource to this site, apart from inline scripts and styles", async () => {
    const policy = directivesOf((await headersOnEveryPath())["Content-Security-Policy"]);
    expect(Object.fromEntries(policy)).toEqual({
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "font-src": ["'self'"],
      "connect-src": ["'self'"],
      "frame-ancestors": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "object-src": ["'none'"],
    });
  });

  it("allows no other host and no eval in a production build", async () => {
    const policy = (await headersOnEveryPath())["Content-Security-Policy"];
    expect(policy).not.toMatch(/https?:|\*|unsafe-eval/);
  });
});
