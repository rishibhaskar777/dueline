import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "@/app/api/profile/route";
import { getProfile, saveProfile } from "@/lib/profile";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { EMPTY_PROFILE, profileSchema, type Profile } from "@/types";
import { stubEnv } from "../support/env";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));

const profile: Profile = {
  yourName: "Riya Sharma",
  businessName: "Riya Sharma Design",
  gstin: "29ABCPS1234C1Z5",
  lutArn: "AD2904260012345",
  lutValidUntil: "2027-03-31",
  defaultSac: "998391",
  website: "https://riya.example.com",
  signOff: "Thank you",
};

function put(body: unknown): Promise<Response> {
  return PUT(
    new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  stubEnv();
  holder.store = createMemoryStore();
});

describe("profileSchema", () => {
  it("accepts a full profile and an empty one", () => {
    expect(profileSchema.parse(profile)).toEqual(profile);
    expect(profileSchema.parse(EMPTY_PROFILE)).toEqual(EMPTY_PROFILE);
  });

  it.each(["29ABCPS1234C1Z5", "07AAACR5055K1Z8", "27AAPFU0939F1ZV", "33ABCDE1234F1ZA"])(
    "accepts the GSTIN %s",
    (gstin) => {
      expect(profileSchema.safeParse({ ...profile, gstin }).success).toBe(true);
    },
  );

  it("writes a GSTIN in capitals", () => {
    expect(profileSchema.parse({ ...profile, gstin: " 29abcps1234c1z5 " }).gstin).toBe(
      "29ABCPS1234C1Z5",
    );
  });

  it.each([
    ["too short", "29ABCPS1234C1Z"],
    ["too long", "29ABCPS1234C1Z55"],
    ["no state code", "ABABCPS1234C1Z5"],
    ["a digit where the PAN has letters", "29AB1PS1234C1Z5"],
    ["a letter where the PAN has digits", "29ABCPS12A4C1Z5"],
    ["no Z in the fourteenth place", "29ABCPS1234C1A5"],
    ["a zero as the entity digit", "29ABCPS1234C0Z5"],
    ["a symbol", "29ABCPS1234C1Z-"],
  ])("rejects a GSTIN that is %s", (_why, gstin) => {
    expect(profileSchema.safeParse({ ...profile, gstin }).success).toBe(false);
  });

  it.each(["998314", "998361", "998391", "990000"])("accepts the SAC %s", (defaultSac) => {
    expect(profileSchema.safeParse({ ...profile, defaultSac }).success).toBe(true);
  });

  it.each(["99831", "9983144", "898314", "99831A", "", " 998314"])(
    "rejects the SAC %j",
    (defaultSac) => {
      expect(profileSchema.safeParse({ ...profile, defaultSac }).success).toBe(false);
    },
  );

  it("accepts a LUT ARN of 15 letters and digits, in capitals", () => {
    expect(profileSchema.parse({ ...profile, lutArn: "ad2904260012345" }).lutArn).toBe(
      "AD2904260012345",
    );
  });

  it.each(["AD290426001234", "AD29042600123456", "AD290426001234-", "AD 290426001234"])(
    "rejects the LUT ARN %j",
    (lutArn) => {
      expect(profileSchema.safeParse({ ...profile, lutArn }).success).toBe(false);
    },
  );

  it("takes a plain date for the end of the LUT", () => {
    expect(profileSchema.safeParse({ ...profile, lutValidUntil: "31-03-2027" }).success).toBe(
      false,
    );
  });

  it.each(["riya.example.com", "ftp://riya.example.com", "javascript:alert(1)"])(
    "rejects the website %j",
    (website) => {
      expect(profileSchema.safeParse({ ...profile, website }).success).toBe(false);
    },
  );

  it("keeps links and email addresses out of the name and the sign-off, which end up in reminders", () => {
    expect(profileSchema.safeParse({ ...profile, yourName: "riya@example.com" }).success).toBe(
      false,
    );
    expect(profileSchema.safeParse({ ...profile, signOff: "See www.riya.dev" }).success).toBe(
      false,
    );
  });

  it("needs a sign-off", () => {
    expect(profileSchema.safeParse({ ...profile, signOff: "  " }).success).toBe(false);
  });

  it("limits the lengths", () => {
    expect(profileSchema.safeParse({ ...profile, yourName: "x".repeat(61) }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, signOff: "x".repeat(41) }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, businessName: "x".repeat(121) }).success).toBe(
      false,
    );
  });
});

describe("getProfile and saveProfile", () => {
  it("returns the empty profile before anything is saved", async () => {
    expect(await getProfile()).toEqual(EMPTY_PROFILE);
    expect(EMPTY_PROFILE).toMatchObject({ yourName: "", businessName: "", signOff: "Thank you" });
  });

  it("keeps what was saved", async () => {
    expect(await saveProfile(profile)).toEqual(profile);
    expect(await getProfile()).toEqual(profile);
  });

  it("fills a row saved by an older version with the defaults", async () => {
    await holder.store?.saveProfile({ yourName: "Riya Sharma" } as unknown as Profile);
    expect(await getProfile()).toEqual({ ...EMPTY_PROFILE, yourName: "Riya Sharma" });
  });

  it("falls back to the empty profile for a row that cannot be read", async () => {
    await holder.store?.saveProfile({ gstin: 12 } as unknown as Profile);
    expect(await getProfile()).toEqual(EMPTY_PROFILE);
  });

  it("refuses an invalid profile and keeps the saved one", async () => {
    await saveProfile(profile);
    await expect(saveProfile({ ...profile, gstin: "nope" })).rejects.toThrow();
    expect(await getProfile()).toEqual(profile);
  });
});

describe("/api/profile", () => {
  it("returns the empty profile before anything is saved", async () => {
    expect(await (await GET()).json()).toEqual(EMPTY_PROFILE);
  });

  it("returns what was saved", async () => {
    const saved = await put(profile);
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual(profile);
    expect(await (await GET()).json()).toEqual(profile);
  });

  it.each([
    ["gstin", { gstin: "123" }],
    ["defaultSac", { defaultSac: "123456" }],
    ["lutArn", { lutArn: "SHORT" }],
    ["website", { website: "riya.example.com" }],
  ])("names the field %s when it is not valid", async (field, changes) => {
    const response = await put({ ...profile, ...changes });
    expect(response.status).toBe(400);
    const { error } = await response.json();
    expect(error.code).toBe("invalid_request");
    expect(error.message.startsWith(`${field}: `)).toBe(true);
  });

  it("refuses a body that is not a profile", async () => {
    expect((await put({ yourName: "Riya" })).status).toBe(400);
  });
});
