import { z } from "zod";
import { isPurposeCode } from "@/lib/export/purpose-codes";

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
  location: z.string().max(200).optional(),
});

export const lineItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(999),
  unitAmount: amountString,
  sourceQuote: z.string().max(500).optional(),
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

export const extractRequestSchema = z.object({ chat: z.string().min(1).max(6000) });

export const payoutEstimateRequestSchema = z.object({ amount: moneySchema });

export const createInvoiceRequestSchema = z.object({
  draft: invoiceDraftForCreateSchema,
  requestId: requestIdSchema,
  discount: z
    .object({
      percent: z.number().gt(0).max(100),
      withinDays: z.number().int().min(1).max(365),
    })
    .optional(),
});

export const sendInvoiceRequestSchema = z.object({ requestId: requestIdSchema });

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "must be YYYY-MM");

export const exportRegisterQuerySchema = z.object({
  month: monthSchema,
  format: z.enum(["json", "csv"]).optional(),
});

export const clientRiskQuerySchema = z.object({ email: z.email() });

export const draftReminderRequestSchema = z.object({
  invoiceId: z.string().min(1),
  tone: toneSchema,
});

export const sendReminderRequestSchema = z.object({
  invoiceId: z.string().min(1),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(4000),
  requestId: requestIdSchema,
});

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

export const settingsSchema = z.object({
  feePercent: z.number().min(0).max(10),
  fixedFees: fixedFeesSchema,
  fxMarkupPercent: z.number().min(0).max(10),
  rateSource: z.enum(["ecb", "manual"]),
  marketRates: marketRatesSchema,
  ratesUpdatedOn: dateString,
});
