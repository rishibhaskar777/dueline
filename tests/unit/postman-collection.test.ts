import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const API_DIR = "src/app/api";

interface Request {
  method: string;
  url: { raw: string; path: string[] };
}
interface Item {
  name: string;
  request: Request;
  event?: { listen: string; script: { exec: string[] } }[];
}
interface Collection {
  info: { schema: string };
  variable: { key: string; value: string }[];
  item: Item[];
}

const collection = JSON.parse(
  readFileSync("docs/postman/dueline-offline.postman_collection.json", "utf8"),
) as Collection;

// A path like /api/invoices/{{balanceId}}/send names src/app/api/invoices/[id]/send/route.ts.
function routeFileFor(path: string[]): string | null {
  let dir = API_DIR;
  for (const segment of path.slice(1)) {
    const names = readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const next = segment.startsWith("{{") ? names.find((n) => /^\[\w+\]$/.test(n)) : segment;
    if (!next || !names.includes(next)) return null;
    dir = join(dir, next);
  }
  const file = join(dir, "route.ts");
  return existsSync(file) ? file : null;
}

describe("the offline Postman collection", () => {
  it("is a Postman Collection v2.1 with a baseUrl variable that points at the local app", () => {
    expect(collection.info.schema).toBe(
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    );
    expect(collection.variable).toContainEqual({ key: "baseUrl", value: "http://localhost:3000" });
  });

  it("covers sign-in, the invoice flow, promises, reminders and the export register", () => {
    expect(
      collection.item.map(({ request }) => `${request.method} /${request.url.path.join("/")}`),
    ).toEqual([
      "POST /api/demo/session",
      "GET /api/health",
      "GET /api/invoices",
      "GET /api/demo/recipient",
      "POST /api/invoices/extract",
      "POST /api/invoices/split",
      "POST /api/invoices/{{balanceId}}/send",
      "PUT /api/invoices/{{lateInvoiceId}}/promise",
      "DELETE /api/invoices/{{lateInvoiceId}}/promise",
      "GET /api/reminders",
      "GET /api/export-register",
    ]);
  });

  it("calls only routes that exist in src/app/api, with a handler for the method", () => {
    for (const { request } of collection.item) {
      const file = routeFileFor(request.url.path);
      expect(file, request.url.raw).not.toBeNull();
      const source = readFileSync(file ?? "", "utf8");
      expect(source, `${request.method} ${request.url.raw}`).toContain(
        `export async function ${request.method}(`,
      );
    }
  });

  it("holds no real password, key, token or address: the offline password and example addresses only", () => {
    const text = readFileSync("docs/postman/dueline-offline.postman_collection.json", "utf8");
    const passwords = text.match(/password[^a-z0-9]{1,6}[a-z0-9]+/gi) ?? [];
    expect(passwords.map((entry) => entry.replace(/^password\W*/i, ""))).toEqual(["offline"]);
    for (const [address] of text.matchAll(/[\w.+-]+@[\w.-]+/g)) {
      expect(address, address).toMatch(/@([\w-]+\.)?example(\.com)?$/);
    }
    expect(text).not.toMatch(/bearer|client_secret|api[_-]?key|authorization/i);
    expect(text).not.toMatch(/paypal\.com/i);
  });

  it("starts every URL from {{baseUrl}} and checks the status in every request", () => {
    for (const { name, request, event } of collection.item) {
      expect(request.url.raw.startsWith("{{baseUrl}}/api/"), name).toBe(true);
      const tests = (event ?? []).filter(({ listen }) => listen === "test");
      expect(tests.length, name).toBe(1);
      expect(tests[0].script.exec.join("\n"), name).toContain("pm.response.code");
    }
  });
});
