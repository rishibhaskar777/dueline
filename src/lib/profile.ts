import "server-only";
import { getStore } from "@/lib/store";
import { EMPTY_PROFILE, profileSchema, type Profile } from "@/types";

const storedSchema = profileSchema.partial();

// A saved row from an older version may lack fields or have a different shape.
export async function getProfile(): Promise<Profile> {
  const parsed = storedSchema.safeParse(await getStore().getProfile());
  return { ...EMPTY_PROFILE, ...(parsed.success ? parsed.data : {}) };
}

export async function saveProfile(input: Profile): Promise<Profile> {
  await getStore().saveProfile(profileSchema.parse(input));
  return getProfile();
}
