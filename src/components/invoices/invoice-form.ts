import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import {
  createInvoiceRequestSchema,
  type CreateInvoiceRequest,
  type CurrencyCode,
  type InvoiceDetailResponse,
  type InvoiceDraft,
  type Money,
  type Profile,
  type RepeatSchedule,
} from "@/types";

const DEFAULT_DISCOUNT_PERCENT = "2";
const DEFAULT_DISCOUNT_DAYS = "7";

export interface FormItem {
  key: string;
  name: string;
  quantity: string;
  unitAmount: string;
  sac: string;
  sourceQuote?: string;
}

export interface InvoiceForm {
  clientName: string;
  clientEmail: string;
  // The person at the client, "" when not set.
  clientContactName: string;
  // ISO country code, "" when not set.
  clientCountry: string;
  currency: CurrencyCode;
  dueOn: string;
  items: FormItem[];
  note: string;
  purposeCode: string | null;
  purposeReason: string;
  includeLutNote: boolean;
  discountOn: boolean;
  discountPercent: string;
  discountDays: string;
  upfront: UpfrontChoice;
  // The whole percent typed for "Custom".
  upfrontCustom: string;
  // "" until the user picks a date; the deposit then falls due a week from today.
  depositDueOn: string;
  // "" until the user picks a date; the balance then falls due on the invoice's due date.
  balanceDueOn: string;
}

export type UpfrontChoice = "off" | "30" | "50" | "custom";

export interface InvoiceTotals {
  subtotal: Money;
  discount: Money | null;
  total: Money;
}

export type FieldErrors = Record<string, string>;

type RequestResult =
  { ok: true; request: CreateInvoiceRequest } | { ok: false; errors: FieldErrors };

const MAX_QUANTITY = 999;

const MESSAGES: Record<string, string> = {
  "client.name": "Enter the client's name",
  "client.email": "Enter the client's email address",
  "client.contactName": "Use a person's name, not an email address",
  dueOn: "Choose a due date",
  items: "Add at least one item",
  "items.*.name": "Enter an item name",
  "items.*.quantity": `Use a whole number from 1 to ${MAX_QUANTITY}`,
  "items.*.sac": "Use 6 digits starting with 99, like 998314",
  note: "Keep the note under 1,000 characters",
  "discount.percent": "Use a percentage from 1 to 20",
  "discount.withinDays": "Use a whole number of days from 3 to 30",
};

export function newItem(sac = ""): FormItem {
  return { key: crypto.randomUUID(), name: "", quantity: "1", unitAmount: "", sac };
}

export function blankForm(defaultSac = "", includeLutNote = false): InvoiceForm {
  return {
    clientName: "",
    clientEmail: "",
    clientContactName: "",
    clientCountry: "",
    currency: "USD",
    dueOn: "",
    items: [newItem(defaultSac)],
    note: "",
    purposeCode: null,
    purposeReason: "",
    includeLutNote,
    discountOn: false,
    discountPercent: DEFAULT_DISCOUNT_PERCENT,
    discountDays: DEFAULT_DISCOUNT_DAYS,
    upfront: "off",
    upfrontCustom: "",
    depositDueOn: "",
    balanceDueOn: "",
  };
}

// Preselects what the client asked for: 30 and 50 have their own buttons, any other whole percent
// opens Custom with the number filled in.
export function withUpfront(form: InvoiceForm, percent: number | null): InvoiceForm {
  if (percent === null) return form;
  if (percent === 30 || percent === 50) return { ...form, upfront: String(percent) as "30" | "50" };
  return { ...form, upfront: "custom", upfrontCustom: String(percent) };
}

export function formFromDraft(draft: InvoiceDraft, includeLutNote = false): InvoiceForm {
  return {
    ...blankForm(),
    clientName: draft.client.name,
    clientEmail: draft.client.email,
    clientContactName: draft.client.contactName ?? "",
    clientCountry: draft.client.country ?? "",
    currency: draft.currency,
    dueOn: draft.dueOn ?? "",
    items: draft.items.map((item) => ({
      key: crypto.randomUUID(),
      name: item.name,
      quantity: String(item.quantity),
      unitAmount: item.unitAmount,
      sac: item.sac ?? "",
      sourceQuote: item.sourceQuote,
    })),
    note: draft.note ?? "",
    purposeCode: draft.purposeCode,
    purposeReason: draft.purposeReason ?? "",
    includeLutNote: draft.includeLutNote || includeLutNote,
  };
}

// A registered exporter sends nearly every invoice under LUT, and one sent without the line implies
// IGST is due. So the line starts ticked when the profile has an ARN and the LUT has not run out.
export function lutIsCurrent(profile: Profile | null, today: string): boolean {
  return Boolean(profile?.lutArn && profile.lutValidUntil && profile.lutValidUntil >= today);
}

export type LutIssue = "missing_arn" | "expired";

// A LUT line without the ARN, or under a LUT that has run out, is worth a second look before sending.
export function lutIssue(
  profile: Profile,
  includeLutNote: boolean,
  today?: string,
): LutIssue | null {
  if (!includeLutNote) return null;
  if (!profile.lutArn) return "missing_arn";
  return today && profile.lutValidUntil && profile.lutValidUntil < today ? "expired" : null;
}

function minorUnitsOf(value: string): number | null {
  try {
    const minor = toMinorUnits(value.trim());
    return minor > 0 ? minor : null;
  } catch {
    return null;
  }
}

function lineTotalMinor(item: FormItem): number | null {
  const unit = minorUnitsOf(item.unitAmount);
  const quantity = Number(item.quantity);
  const valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY;
  return unit !== null && valid ? unit * quantity : null;
}

export function lineTotal(item: FormItem, currency: CurrencyCode): Money | null {
  const minor = lineTotalMinor(item);
  return minor === null ? null : { currency, value: fromMinorUnits(minor) };
}

// Works in basis points of a percent, so a value like 2.5 never goes through a float multiply.
function discountMinorUnits(subtotal: number, form: InvoiceForm): number {
  const percent = Number(form.discountPercent);
  if (!form.discountOn || !(percent >= 1 && percent <= 20)) return 0;
  return Math.round((subtotal * Math.round(percent * 100)) / 10_000);
}

export function calculateTotals(form: InvoiceForm): InvoiceTotals | null {
  const lines = form.items.map(lineTotalMinor);
  if (lines.length === 0 || lines.some((line) => line === null)) return null;

  const subtotal = lines.reduce<number>((sum, line) => sum + (line ?? 0), 0);
  const discount = discountMinorUnits(subtotal, form);
  const money = (minor: number): Money => ({
    currency: form.currency,
    value: fromMinorUnits(minor),
  });
  return {
    subtotal: money(subtotal),
    discount: discount > 0 ? money(discount) : null,
    total: money(subtotal - discount),
  };
}

export interface HeldNotice {
  message: string;
  createAnother: boolean;
}

// The server keeps a held request's result for its request ID. If the form was edited since, a
// retry is a different body under the same ID, so the user has to start a new invoice instead.
export function describeHeld(code: string, serverMessage: string, edited: boolean): HeldNotice {
  if (code === "duplicate_request" && edited) {
    return {
      message:
        "These details changed after the invoice was submitted. Check Receivables first. To send a different invoice, click Create another.",
      createAnother: true,
    };
  }
  return { message: serverMessage, createAnother: false };
}

function fieldOf(path: PropertyKey[]): string {
  const names = path[0] === "draft" ? path.slice(1) : path;
  return names.map(String).join(".");
}

function messageFor(field: string, fallback: string): string {
  return MESSAGES[field.replace(/\.\d+\./g, ".*.")] ?? fallback;
}

// Server messages read "draft.client.email: Invalid email address", or the date rule on its own.
export function fieldErrorsFromServer(message: string): FieldErrors | null {
  if (message.startsWith("dueOn ")) return { dueOn: "Choose today or a later date" };
  const [path, ...rest] = message.split(": ");
  if (rest.length === 0) return null;
  const field = path.replace(/^draft\./, "");
  return { [field]: messageFor(field, rest.join(": ")) };
}

// The server checks the same schema again; this only saves the user a round trip.
export function toRequest(form: InvoiceForm, requestId: string, today?: string): RequestResult {
  const note = form.note.trim();
  const parsed = createInvoiceRequestSchema.safeParse({
    draft: {
      client: {
        name: form.clientName.trim(),
        email: form.clientEmail.trim(),
        ...(form.clientCountry ? { country: form.clientCountry } : {}),
        ...(form.clientContactName.trim() ? { contactName: form.clientContactName.trim() } : {}),
      },
      currency: form.currency,
      dueOn: form.dueOn,
      items: form.items.map((item) => ({
        name: item.name.trim(),
        quantity: Number(item.quantity),
        unitAmount: item.unitAmount.trim(),
        sac: item.sac.trim() || null,
      })),
      ...(note ? { note } : {}),
      purposeCode: form.purposeCode,
      includeLutNote: form.includeLutNote,
    },
    requestId,
    ...(form.discountOn
      ? {
          discount: {
            percent: Number(form.discountPercent),
            withinDays: Number(form.discountDays),
          },
        }
      : {}),
  });

  const errors: FieldErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = fieldOf(issue.path);
      errors[field] ??= messageFor(field, issue.message);
    }
  }
  if (form.dueOn && today && form.dueOn < today) errors.dueOn ??= "Choose today or a later date";

  return parsed.success && Object.keys(errors).length === 0
    ? { ok: true, request: parsed.data }
    : { ok: false, errors };
}

// A new invoice made from an earlier one keeps the client and the items. The due date, the note and
// any discount are chosen again, so nothing from the earlier invoice is sent twice.
export function formFromInvoice(
  { invoice, details }: Pick<InvoiceDetailResponse, "invoice" | "details">,
  defaultSac = "",
): InvoiceForm {
  return {
    ...blankForm(defaultSac),
    clientName: invoice.client.name,
    clientEmail: invoice.client.email,
    clientContactName: invoice.client.contactName ?? "",
    clientCountry: invoice.client.country ?? "",
    currency: invoice.amount.currency,
    items: details.items.map((item) => ({
      key: crypto.randomUUID(),
      name: item.name,
      quantity: String(item.quantity),
      unitAmount: item.unitAmount.value,
      sac: item.sac ?? defaultSac,
    })),
    purposeCode: invoice.purposeCode,
    includeLutNote: details.underLut,
  };
}

// A draft prepared by a monthly repeat has the same client and items as the invoice it came from.
// The due date and the note are chosen again, like for a copy.
export function formFromRepeat(repeat: RepeatSchedule, defaultSac = ""): InvoiceForm {
  return {
    ...blankForm(defaultSac),
    clientName: repeat.clientName,
    clientEmail: repeat.clientEmail,
    currency: repeat.currency,
    items: repeat.items.map((item) => ({
      key: crypto.randomUUID(),
      name: item.name,
      quantity: String(item.quantity),
      unitAmount: item.unitAmount,
      sac: item.sac ?? defaultSac,
    })),
    purposeCode: repeat.purposeCode,
    includeLutNote: repeat.includeLutNote,
  };
}
