import { profileSchema, type Profile } from "@/types";

// Every field is text while it is being edited; an empty optional field becomes null on save.
export interface ProfileFormValues {
  yourName: string;
  businessName: string;
  gstin: string;
  lutArn: string;
  lutValidUntil: string;
  defaultSac: string;
  website: string;
  signOff: string;
}

export type ProfileField = keyof ProfileFormValues;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

type ProfileResult = { ok: true; profile: Profile } | { ok: false; errors: ProfileErrors };

export function toForm(profile: Profile): ProfileFormValues {
  return {
    yourName: profile.yourName,
    businessName: profile.businessName,
    gstin: profile.gstin ?? "",
    lutArn: profile.lutArn ?? "",
    lutValidUntil: profile.lutValidUntil ?? "",
    defaultSac: profile.defaultSac ?? "",
    website: profile.website ?? "",
    signOff: profile.signOff,
  };
}

function orNull(text: string): string | null {
  return text.trim() === "" ? null : text;
}

const FIELDS: string[] = profileSchema.keyof().options;

function isField(name: string): name is ProfileField {
  return FIELDS.includes(name);
}

export function validateProfile(form: ProfileFormValues): ProfileResult {
  const parsed = profileSchema.safeParse({
    yourName: form.yourName,
    businessName: form.businessName,
    gstin: orNull(form.gstin),
    lutArn: orNull(form.lutArn),
    lutValidUntil: orNull(form.lutValidUntil),
    defaultSac: orNull(form.defaultSac),
    website: orNull(form.website),
    signOff: form.signOff,
  });
  if (parsed.success) return { ok: true, profile: parsed.data };

  const errors: ProfileErrors = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0]);
    if (isField(field)) errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}
