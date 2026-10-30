import { useEffect, useState } from "react";
import { getDemoRecipient, getHealth, getPurposeCodes } from "@/lib/api-client";
import type { PurposeCode } from "@/types";

interface FormReferences {
  codes: PurposeCode[];
  demoEmail: string | null;
  today: string | undefined;
}

// The form works without any of these: no codes to pick from, no demo button, no minimum date.
export function useFormReferences(): FormReferences {
  const [codes, setCodes] = useState<PurposeCode[]>([]);
  const [demoEmail, setDemoEmail] = useState<string | null>(null);
  const [today, setToday] = useState<string | undefined>(undefined);

  useEffect(() => {
    let current = true;
    getPurposeCodes().then(
      (loaded) => current && setCodes(loaded),
      () => {},
    );
    getDemoRecipient().then(
      (email) => current && setDemoEmail(email),
      () => {},
    );
    getHealth().then(
      (health) => current && setToday(health.today),
      () => {},
    );
    return () => {
      current = false;
    };
  }, []);

  return { codes, demoEmail, today };
}
