import { describe, expect, it } from "vitest";
import { toForm, validateProfile } from "@/components/profile/profile-form";
import { EMPTY_PROFILE, type Profile } from "@/types";

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

describe("profile form", () => {
  it("shows an empty optional field as empty text and saves it back as null", () => {
    const form = toForm(EMPTY_PROFILE);
    expect(form).toMatchObject({ gstin: "", lutArn: "", defaultSac: "", website: "" });
    expect(validateProfile(form)).toEqual({ ok: true, profile: EMPTY_PROFILE });
  });

  it("round-trips a full profile", () => {
    expect(validateProfile(toForm(profile))).toEqual({ ok: true, profile });
  });

  it("trims what was typed", () => {
    const result = validateProfile({ ...toForm(profile), yourName: "  Riya Sharma ", gstin: " " });
    expect(result).toEqual({
      ok: true,
      profile: { ...profile, yourName: "Riya Sharma", gstin: null },
    });
  });

  it("names each field that needs fixing", () => {
    const result = validateProfile({
      ...toForm(profile),
      gstin: "12345",
      lutArn: "SHORT",
      defaultSac: "123456",
      website: "riya.example.com",
      signOff: "",
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        gstin: "must be 15 characters, like 29ABCDE1234F1Z5",
        lutArn: "must be 15 letters and digits",
        defaultSac: "must be 6 digits starting with 99",
        website: "must be a web address starting with http:// or https://",
        signOff: "must not be empty",
      },
    });
  });
});
