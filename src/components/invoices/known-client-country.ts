"use client";

import { useEffect, useRef } from "react";
import { getClients } from "@/lib/api-client";
import { clientKey } from "@/lib/risk/client-key";
import type { ClientSummary } from "@/types";
import type { InvoiceForm } from "./invoice-form";

// The country of the client the form is for: found by name, or else by an email only one client has
// (the demo's clients share one sandbox address, so there it never decides).
export function knownClientCountry(
  clients: ClientSummary[],
  name: string,
  email: string,
): string | null {
  const byName = clients.find(({ key }) => name.trim() !== "" && key === clientKey(name));
  if (byName) return byName.country;
  const wanted = email.trim().toLowerCase();
  if (wanted === "") return null;
  const sameEmail = clients.filter((client) => client.email.toLowerCase() === wanted);
  return sameEmail.length === 1 ? sameEmail[0].country : null;
}

// Fills an empty Country from the client's history, once per client, so a person who clears it or
// picks another one is not overruled.
export function useKnownClientCountry(
  form: Pick<InvoiceForm, "clientName" | "clientEmail" | "clientCountry">,
  update: (changes: Partial<InvoiceForm>) => void,
): void {
  const clients = useRef<ClientSummary[] | null>(null);
  const filledFor = useRef<string | null>(null);
  const { clientName, clientEmail, clientCountry } = form;

  useEffect(() => {
    if (clientCountry !== "") return;
    let current = true;
    const fill = (list: ClientSummary[]) => {
      const country = knownClientCountry(list, clientName, clientEmail);
      const key = `${clientName.trim().toLowerCase()}|${clientEmail.trim().toLowerCase()}`;
      if (!current || !country || filledFor.current === key) return;
      filledFor.current = key;
      update({ clientCountry: country });
    };
    if (clients.current) {
      fill(clients.current);
    } else {
      getClients().then(
        (list) => {
          clients.current = list;
          fill(list);
        },
        () => {},
      );
    }
    return () => {
      current = false;
    };
  }, [clientName, clientEmail, clientCountry, update]);
}
