import type { Client } from "@/types";

function normaliseName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

// A client is known by business name or, outside the demo, by email as well. In the demo every
// client shares one sandbox buyer email, so there the name alone decides. Without a name the email
// is all there is to go on.
export function isSameClient(
  client: Client,
  other: { email: string; name?: string },
  emailIdentifies: boolean,
): boolean {
  const sameEmail = normaliseEmail(client.email) === normaliseEmail(other.email);
  if (other.name === undefined) return sameEmail;
  return normaliseName(client.name) === normaliseName(other.name) || (emailIdentifies && sameEmail);
}
