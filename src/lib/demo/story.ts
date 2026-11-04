import { addDays, financialYearOf, financialYearRange } from "@/lib/date-math";
import { memoOf } from "@/lib/paypal/memo";
import type { Money, Profile, Tone } from "@/types";

export interface DemoInvoice {
  key: string;
  clientName: string;
  // The person at the client, who reminders greet by first name.
  contactName: string;
  country: string;
  work: string;
  amount: Money;
  purposeCode: string | null;
  issuedOn: string;
  dueOn: string;
  // Set for an invoice that is history: it is recorded as paid on this date.
  paidOn: string | null;
  // A reminder Dueline sent earlier, kept in its own log only; nothing is sent to PayPal.
  reminder: { tone: Tone; sentOn: string } | null;
  // The bank's FIRC number for a payment that came by bank transfer, when the story has one.
  bankReference: string | null;
}

// Days from today. A negative number is in the past.
interface Offsets {
  issued: number;
  due: number;
  paid?: number;
}

interface Engagement {
  clientName: string;
  contactName: string;
  country: string;
  work: string;
  amount: Money;
  purposeCode: string | null;
}

interface Template extends Engagement {
  key: string;
  offsets: Offsets;
  // Days after the due date the reminder went out.
  reminderDaysLate?: { tone: Tone; daysLate: number };
  bankReference?: string;
}

// The story's open and latest invoices. The sample data in src/mocks reuses them so both show the
// same clients.
export const engagements = {
  brightwellLanding: {
    clientName: "Brightwell Labs",
    contactName: "Jo Marsh",
    country: "GB",
    work: "Landing page UI",
    amount: { currency: "GBP", value: "600.00" },
    purposeCode: "P1099",
  },
  okaforGuidelines: {
    clientName: "Okafor & Reyes",
    contactName: "Ana Okafor",
    country: "PT",
    work: "Brand guidelines",
    amount: { currency: "EUR", value: "720.00" },
    purposeCode: "P1099",
  },
  northpineKit: {
    clientName: "Northpine Studio",
    contactName: "Dan Keane",
    country: "CA",
    work: "Social media kit",
    amount: { currency: "CAD", value: "380.00" },
    purposeCode: "P1007",
  },
  tandemDeck: {
    clientName: "Tandem Health",
    contactName: "Tom Hale",
    country: "US",
    work: "Pitch deck design",
    amount: { currency: "USD", value: "900.00" },
    purposeCode: "P1099",
  },
  haldenMenu: {
    clientName: "Halden Coffee Co.",
    contactName: "Mike Halden",
    country: "US",
    work: "Menu redesign",
    amount: { currency: "USD", value: "280.00" },
    purposeCode: "P1099",
  },
  southbankBranding: {
    clientName: "Southbank Creative",
    contactName: "Priya Nair",
    country: "AU",
    work: "Event branding",
    amount: { currency: "AUD", value: "650.00" },
    purposeCode: "P1099",
  },
} satisfies Record<string, Engagement>;

export const DEMO_SAC = "998391";

// The freelancer behind the demo. The identifiers are made up and pass only the format checks; the
// LUT runs to the end of the financial year the demo date is in.
export function buildDemoProfile(today: string): Profile {
  return {
    yourName: "Riya Sharma",
    businessName: "Riya Sharma Design",
    gstin: "29ABCPS1234C1Z5",
    lutArn: "AD2904260012345",
    lutValidUntil: financialYearRange(financialYearOf(today.slice(0, 7))).to,
    defaultSac: DEMO_SAC,
    website: null,
    address: "12 Brigade Road, Bengaluru 560001, Karnataka",
    signOff: "Thank you",
    sendHeadsUp: true,
    headsUpDays: 3,
  };
}

const MEMO_PREFIX = "dueline-demo:";

// The marker is "dueline-demo:<generation>:<key>". Invoices made before generations existed read
// "dueline-demo:<key>" and count as generation 0, older than any generation a reset starts.
export function demoMemo(
  generation: number,
  key: string,
  purposeCode: string | null = null,
  sac: string | null = null,
): string {
  return memoOf(`${MEMO_PREFIX}${generation}:${key}`, purposeCode, sac);
}

export function isDemoMemo(memo: string | undefined): boolean {
  return memo?.startsWith(MEMO_PREFIX) ?? false;
}

export interface StoryMarker {
  generation: number;
  key: string;
}

// Reads the marker (the memo's first word); null when it is not a story marker.
export function storyMarkerOf(marker: string): StoryMarker | null {
  if (!marker.startsWith(MEMO_PREFIX)) return null;
  const rest = marker.slice(MEMO_PREFIX.length);
  const match = /^(\d+):(.+)$/.exec(rest);
  return match ? { generation: Number(match[1]), key: match[2] } : { generation: 0, key: rest };
}

function template(
  key: string,
  engagement: Engagement,
  offsets: Offsets,
  reminderDaysLate?: Template["reminderDaysLate"],
): Template {
  return { ...engagement, key, offsets, reminderDaysLate };
}

function earlier(
  key: string,
  engagement: Engagement,
  work: string,
  value: string,
  offsets: Offsets,
  reminderDaysLate?: Template["reminderDaysLate"],
): Template {
  return {
    ...template(key, engagement, offsets, reminderDaysLate),
    work,
    amount: { currency: engagement.amount.currency, value },
  };
}

// A story is shown for up to RESEED_AFTER_DAYS - 1 days before the daily run seeds a new one. Northpine
// Studio is due soon on days 0 to 3 of that time and Tandem Health on days 4 to 6, so Home always
// shows something due soon.
export const RESEED_AFTER_DAYS = 7;

// Okafor & Reyes pay about two weeks late every time and are late again now, so the radar calls them
// a late payer; their "Website copy" invoice was chased once, gently, three days after it fell due.
// Brightwell Labs paid six days late and is three days late now, which is a watch. Halden Coffee Co.
// paid both of its invoices early, so it is reliable, and the second one lands inside any 30-day
// window. Southbank Creative paid both of its invoices two days before they fell due, by bank
// transfer, so it is reliable and adds nothing to what is due soon or overdue. Northpine Studio and
// Tandem Health have one open invoice each.
const TEMPLATES: Template[] = [
  earlier("okafor-logo-refresh", engagements.okaforGuidelines, "Logo refresh", "540.00", {
    issued: -75,
    due: -61,
    paid: -49,
  }),
  earlier(
    "okafor-website-copy",
    engagements.okaforGuidelines,
    "Website copy",
    "450.00",
    { issued: -45, due: -31, paid: -15 },
    { tone: "gentle", daysLate: 3 },
  ),
  template("okafor-brand-guidelines", engagements.okaforGuidelines, { issued: -16, due: -7 }),
  template("halden-menu-redesign", engagements.haldenMenu, { issued: -40, due: -26, paid: -28 }),
  earlier("halden-loyalty-cards", engagements.haldenMenu, "Loyalty card design", "180.00", {
    issued: -14,
    due: 0,
    paid: -4,
  }),
  {
    ...earlier("brightwell-icon-set", engagements.brightwellLanding, "Icon set", "350.00", {
      issued: -50,
      due: -36,
      paid: -30,
    }),
    bankReference: "FIRC/2026/001",
  },
  template("brightwell-landing-page", engagements.brightwellLanding, { issued: -17, due: -3 }),
  template("northpine-social-media-kit", engagements.northpineKit, { issued: -11, due: 3 }),
  template("tandem-pitch-deck", engagements.tandemDeck, { issued: -8, due: 7 }),
  {
    ...template("southbank-event-branding", engagements.southbankBranding, {
      issued: -55,
      due: -41,
      paid: -43,
    }),
    bankReference: "FIRC/2026/002",
  },
  earlier("southbank-event-signage", engagements.southbankBranding, "Event signage", "420.00", {
    issued: -24,
    due: -10,
    paid: -12,
  }),
];

export function buildDemoStory(today: string): DemoInvoice[] {
  return TEMPLATES.map(({ offsets, reminderDaysLate, bankReference, ...template }) => {
    const dueOn = addDays(today, offsets.due);
    return {
      ...template,
      issuedOn: addDays(today, offsets.issued),
      dueOn,
      paidOn: offsets.paid === undefined ? null : addDays(today, offsets.paid),
      reminder: reminderDaysLate
        ? { tone: reminderDaysLate.tone, sentOn: addDays(dueOn, reminderDaysLate.daysLate) }
        : null,
      bankReference: bankReference ?? null,
    };
  });
}

// The fields that say whose profile this is. Only these decide whether a stored profile is the demo
// one, so a field added to the profile later (like the address was) never makes an older demo
// profile look like one a person typed.
const DEMO_IDENTITY_FIELDS = [
  "yourName",
  "businessName",
  "gstin",
  "lutArn",
  "defaultSac",
  "signOff",
] as const satisfies readonly (keyof Profile)[];

function isFilled(value: string | number | boolean | null): boolean {
  return value !== null && value !== "";
}

// A stored profile is the demo profile when every identity field it has filled in matches the demo's.
export function isDemoProfile(profile: Profile, today: string): boolean {
  const demo = buildDemoProfile(today);
  return DEMO_IDENTITY_FIELDS.every(
    (field) => !isFilled(profile[field]) || profile[field] === demo[field],
  );
}

// The current demo profile, keeping any other value the stored one already has. The LUT date always
// moves with the demo date.
export function upgradedDemoProfile(profile: Profile, today: string): Profile {
  const demo = buildDemoProfile(today);
  const kept = (Object.keys(demo) as (keyof Profile)[]).filter(
    (field) => field !== "lutValidUntil" && isFilled(profile[field]),
  );
  return { ...demo, ...Object.fromEntries(kept.map((field) => [field, profile[field]])) };
}
