import { addDays } from "@/lib/date-math";
import type { Money } from "@/types";

export interface DemoInvoice {
  key: string;
  clientName: string;
  work: string;
  amount: Money;
  purposeCode: string | null;
  issuedOn: string;
  dueOn: string;
  // Set for an invoice that is history: it is recorded as paid on this date.
  paidOn: string | null;
}

// Days from today. A negative number is in the past.
interface Offsets {
  issued: number;
  due: number;
  paid?: number;
}

interface Engagement {
  clientName: string;
  work: string;
  amount: Money;
  purposeCode: string | null;
}

interface Template extends Engagement {
  key: string;
  offsets: Offsets;
}

// The story's open and latest invoices. The sample data in src/mocks reuses them so both show the
// same clients.
export const engagements = {
  brightwellLanding: {
    clientName: "Brightwell Labs",
    work: "Landing page UI",
    amount: { currency: "GBP", value: "600.00" },
    purposeCode: "P1099",
  },
  okaforGuidelines: {
    clientName: "Okafor & Reyes",
    work: "Brand guidelines",
    amount: { currency: "EUR", value: "720.00" },
    purposeCode: "P1099",
  },
  northpineKit: {
    clientName: "Northpine Studio",
    work: "Social media kit",
    amount: { currency: "CAD", value: "380.00" },
    purposeCode: "P1007",
  },
  tandemDeck: {
    clientName: "Tandem Health",
    work: "Pitch deck design",
    amount: { currency: "USD", value: "900.00" },
    purposeCode: "P1099",
  },
  haldenMenu: {
    clientName: "Halden Coffee Co.",
    work: "Menu redesign",
    amount: { currency: "USD", value: "280.00" },
    purposeCode: "P1099",
  },
} satisfies Record<string, Engagement>;

const MEMO_PREFIX = "dueline-demo:";

// The memo is visible only to the invoicer. It marks the invoices that belong to the story.
export function demoMemo(key: string): string {
  return `${MEMO_PREFIX}${key}`;
}

export function isDemoMemo(memo: string | undefined): boolean {
  return memo?.startsWith(MEMO_PREFIX) ?? false;
}

function template(key: string, engagement: Engagement, offsets: Offsets): Template {
  return { ...engagement, key, offsets };
}

function earlier(
  key: string,
  engagement: Engagement,
  work: string,
  value: string,
  offsets: Offsets,
): Template {
  return {
    ...template(key, engagement, offsets),
    work,
    amount: { currency: engagement.amount.currency, value },
  };
}

// Okafor & Reyes pay about two weeks late every time and are late again now, so the radar calls them
// a late payer. Brightwell Labs paid six days late and is three days late now, which is a watch.
// Halden Coffee Co. paid two days early.
const TEMPLATES: Template[] = [
  earlier("okafor-logo-refresh", engagements.okaforGuidelines, "Logo refresh", "540.00", {
    issued: -75,
    due: -61,
    paid: -49,
  }),
  earlier("okafor-website-copy", engagements.okaforGuidelines, "Website copy", "450.00", {
    issued: -45,
    due: -31,
    paid: -15,
  }),
  template("okafor-brand-guidelines", engagements.okaforGuidelines, { issued: -16, due: -7 }),
  template("halden-menu-redesign", engagements.haldenMenu, { issued: -40, due: -26, paid: -28 }),
  earlier("brightwell-icon-set", engagements.brightwellLanding, "Icon set", "350.00", {
    issued: -50,
    due: -36,
    paid: -30,
  }),
  template("brightwell-landing-page", engagements.brightwellLanding, { issued: -17, due: -3 }),
  template("northpine-social-media-kit", engagements.northpineKit, { issued: -11, due: 3 }),
  template("tandem-pitch-deck", engagements.tandemDeck, { issued: -8, due: 13 }),
];

export function buildDemoStory(today: string): DemoInvoice[] {
  return TEMPLATES.map(({ offsets, ...template }) => ({
    ...template,
    issuedOn: addDays(today, offsets.issued),
    dueOn: addDays(today, offsets.due),
    paidOn: offsets.paid === undefined ? null : addDays(today, offsets.paid),
  }));
}
