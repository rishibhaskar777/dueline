import { describe, expect, it } from "vitest";
import type { ProfileFormValues } from "@/components/profile/profile-form";
import { initialsOf, previewDetails } from "@/components/profile/profile-preview";

const FORM: ProfileFormValues = {
  yourName: "Riya Sharma",
  businessName: "Riya Sharma Design",
  gstin: "29ABCPS1234C1Z5",
  lutArn: "",
  lutValidUntil: "",
  defaultSac: "",
  website: "",
  address: "",
  signOff: "Thank you",
};

describe("initialsOf", () => {
  it("takes the first letters of the business name", () => {
    expect(initialsOf(FORM)).toBe("RS");
    expect(initialsOf({ ...FORM, businessName: "halden" })).toBe("H");
  });

  it("falls back to the person's name, and to nothing", () => {
    expect(initialsOf({ ...FORM, businessName: "  " })).toBe("RS");
    expect(initialsOf({ ...FORM, businessName: "", yourName: "" })).toBe("");
  });
});

describe("previewDetails", () => {
  it("joins the name, the GSTIN and the website that are filled in", () => {
    expect(previewDetails(FORM)).toBe("Riya Sharma · GSTIN 29ABCPS1234C1Z5");
    expect(previewDetails({ ...FORM, website: "https://riya.example" })).toBe(
      "Riya Sharma · GSTIN 29ABCPS1234C1Z5 · https://riya.example",
    );
  });

  it("asks for a name when there is none", () => {
    expect(previewDetails({ ...FORM, yourName: "", gstin: "" })).toBe("Your name");
  });
});
