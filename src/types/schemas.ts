import { z } from "zod";
import { isCountryCode } from "@/lib/countries";
import { isFinancialYear } from "@/lib/date-math";
import { isPurposeCode } from "@/lib/export/purpose-codes";
import { hasLinkOrAddress } from "@/lib/reminders/check-reminder";

export const currencySchema = z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]);

const amountString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "must be a number with at most 2 decimals")
  .refine((value) => Number(value) > 0, "must be greater than zero");

const dateString = z.iso.date();

export const moneySchema = z.object({ currency: currencySchema, value: amountString });

export const clientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.email(),
  country: z.string().refine(isCountryCode, "must be a supported country code").optional(),
});

export const sacSchema = z.string().regex(/^99[0-9]{4}$/, "must be 6 digits starting with 99");

export const lineItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(999),
  unitAmount: amountString,
  sourceQuote: z.string().max(500).optional(),
  sac: sacSchema.nullable().default(null),
});

const purposeCodeSchema = z
  .string()
  .refine(isPurposeCode, "must be a code from the purpose code list")
  .nullable();

const draftFields = {
  client: clientSchema,
  currency: currencySchema,
  items: z.array(lineItemSchema).min(1).max(50),
  note: z.string().max(1000).optional(),
  purposeCode: purposeCodeSchema,
  purposeReason: z.string().max(300).optional(),
  includeLutNote: z.boolean(),
};

export const invoiceDraftSchema = z.object({ ...draftFields, dueOn: dateString.nullable() });

export const invoiceDraftForCreateSchema = z.object({ ...draftFields, dueOn: dateString });

export const requestIdSchema = z.uuid();

export const toneSchema = z.enum(["gentle", "firm", "final"]);

export const reminderLanguageSchema = z.enum(["en", "de", "fr", "es", "nl", "pt", "hi"]);

export const extractRequestSchema = z.object({ chat: z.string().min(1).max(6000) });

export const payoutEstimateRequestSchema = z.object({ amount: moneySchema });

export const createInvoiceRequestSchema = z.object({
  draft: invoiceDraftForCreateSchema,
  requestId: requestIdSchema,
  discount: z
    .object({
      percent: z.number().min(1).max(20),
      withinDays: z.number().int().min(3).max(30),
    })
    .optional(),
});

export type CreateInvoiceRequest = z.infer<typeof createInvoiceRequestSchema>;

export const invoiceIdSchema = z.string().min(1).max(100);

export const sendInvoiceRequestSchema = z.object({ requestId: requestIdSchema });

export const demoSessionRequestSchema = z.object({ password: z.string().min(1).max(200) });

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "must be YYYY-MM");

export const exportRegisterQuerySchema = z.object({
  month: monthSchema,
  format: z.enum(["json", "csv"]).optional(),
});

export const clientRiskQuerySchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(200).optional(),
});

export const draftReminderRequestSchema = z.object({
  invoiceId: z.string().min(1),
  tone: toneSchema,
  language: reminderLanguageSchema.optional(),
});

export const reminderChannelSchema = z.enum(["paypal", "email"]);

// "paypal" asks PayPal to email its own reminder. "email" only records that the freelancer sent their
// drafted message from their own email; the words never come to the server.
export const sendReminderRequestSchema = z.object({
  invoiceId: z.string().min(1),
  tone: toneSchema,
  channel: reminderChannelSchema,
  requestId: requestIdSchema,
});

export type SendReminderRequest = z.infer<typeof sendReminderRequestSchema>;

const feeString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "must be a number with at most 2 decimals")
  .refine((value) => Number(value) <= 5, "must be between 0.00 and 5.00");

const marketRate = z.number().gt(0).lt(1000);

export const fixedFeesSchema = z.object({
  USD: feeString,
  EUR: feeString,
  GBP: feeString,
  CAD: feeString,
  AUD: feeString,
});

export const marketRatesSchema = z.object({
  USD: marketRate,
  EUR: marketRate,
  GBP: marketRate,
  CAD: marketRate,
  AUD: marketRate,
});

export const rateAlertSchema = z.object({
  currency: currencySchema,
  direction: z.enum(["above", "below"]),
  threshold: marketRate,
});

export const settingsSchema = z.object({
  feePercent: z.number().min(0).max(10),
  fixedFees: fixedFeesSchema,
  fxMarkupPercent: z.number().min(0).max(10),
  rateSource: z.enum(["ecb", "manual"]),
  marketRates: marketRatesSchema,
  ratesUpdatedOn: dateString,
  prepareReminders: z.boolean(),
  remindAfterDays: z.number().int().min(1).max(60),
  rateAlerts: z.array(rateAlertSchema).max(3),
});

export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    "must be 15 characters, like 29ABCDE1234F1Z5",
  );

const lutArnSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9A-Z]{15}$/, "must be 15 letters and digits");

const websiteSchema = z
  .url({ protocol: /^https?$/, error: "must be a web address starting with http:// or https://" })
  .max(200);

// Both end up in reminders, which must not carry links or email addresses.
const plainText = (max: number, min = 0) =>
  z
    .string()
    .trim()
    .min(min, "must not be empty")
    .max(max)
    .refine(
      (text) => !hasLinkOrAddress(text, { clientName: "", work: "" }),
      "must not contain links or email addresses",
    );

export const profileSchema = z.object({
  yourName: plainText(60),
  businessName: z.string().trim().max(120),
  gstin: gstinSchema.nullable(),
  lutArn: lutArnSchema.nullable(),
  lutValidUntil: dateString.nullable(),
  defaultSac: sacSchema.nullable(),
  website: websiteSchema.nullable(),
  signOff: plainText(40, 1),
});

export const gstr1QuerySchema = z.object({
  month: monthSchema,
  format: z.literal("csv").optional(),
});

export const annualQuerySchema = z.object({
  fy: z.string().refine(isFinancialYear, "must be a financial year like 2026-27"),
  format: z.enum(["json", "csv"]).optional(),
});

// Keys hold only letters, digits and hyphens, but an address may carry accented letters encoded.
function decodeKey(key: string): string {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

export const clientKeySchema = z.string().min(1).max(200).transform(decodeKey);

export const clientNotesRequestSchema = z.object({ notes: z.string().max(1000) });

export const mergeClientRequestSchema = z.object({ into: clientKeySchema });

export const cancelInvoiceRequestSchema = z.object({
  requestId: requestIdSchema,
  notifyClient: z.boolean().optional(),
});

export type CancelInvoiceRequest = z.infer<typeof cancelInvoiceRequestSchema>;

export const recordPaymentRequestSchema = z.object({
  requestId: requestIdSchema,
  method: z.enum(["BANK_TRANSFER", "WIRE_TRANSFER", "OTHER"]),
  paidOn: dateString,
  note: z.string().max(200).optional(),
});

export type RecordPaymentRequest = z.infer<typeof recordPaymentRequestSchema>;

export const clientLanguageRequestSchema = z.object({ language: reminderLanguageSchema });

export const queueItemIdSchema = z.string().min(1).max(200);

export const repeatsQuerySchema = z.object({ client: clientKeySchema.optional() });

export const createRepeatRequestSchema = z.object({
  invoiceId: invoiceIdSchema,
  dayOfMonth: z.number().int().min(1).max(28),
  requestId: requestIdSchema,
});

export const updateRepeatRequestSchema = z.object({ paused: z.boolean() });

export const repeatIdSchema = z.uuid();

export const saveLibraryItemRequestSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(200),
  unitAmount: amountString,
  currency: currencySchema,
  sac: sacSchema.nullable(),
});

export const libraryItemIdSchema = z.uuid();

export const hiddenInvoiceRequestSchema = z.object({
  invoiceId: invoiceIdSchema,
  hidden: z.boolean(),
});

// The bank's FIRC or e-BRC number. An empty string clears it.
export const bankReferenceRequestSchema = z.object({
  invoiceId: invoiceIdSchema,
  reference: z
    .string()
    .trim()
    .max(40)
    .regex(/^[A-Za-z0-9/-]*$/),
});

export const BANK_REFERENCE_MESSAGE = "Use letters, digits, / and - only, up to 40 characters.";
