import type { Client } from "@/types";

function normaliseName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

// In the demo every client shares one sandbox email, so the name is part of who the client is.
export function clientKeyOf(client: Client): string {
  return `${normaliseName(client.name)}|${normaliseEmail(client.email)}`;
}

export function isSameClient(client: Client, email: string, name?: string): boolean {
  if (normaliseEmail(client.email) !== normaliseEmail(email)) return false;
  return name === undefined || normaliseName(client.name) === normaliseName(name);
}
