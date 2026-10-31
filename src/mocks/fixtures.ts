import { engagements } from "@/lib/demo/story";
import {
  DEFAULT_SETTINGS,
  type ClientRisk,
  type ActivityEvent,
  type ExportRegister,
  type ExtractResponse,
  type HealthResponse,
  type InvoiceSummary,
  type PayoutEstimate,
  type Settings,
  type Totals,
} from "@/types";

export const FIXTURE_TODAY = "2026-10-17";

export const brightwellInvoice: InvoiceSummary = {
  id: "INV2-BRTW-0043-A1B2-C3D4",
  number: "INV-0043",
  client: {
    name: engagements.brightwellLanding.clientName,
    email: "accounts@brightwell.example.com",
    location: "London, United Kingdom",
  },
  work: engagements.brightwellLanding.work,
  amount: engagements.brightwellLanding.amount,
  issuedOn: "2026-09-28",
  dueOn: "2026-10-12",
  paidOn: null,
  paypalStatus: "UNPAID",
  dueState: "overdue",
  daysLate: 5,
  payoutInr: 64519,
  payoutSource: "estimate",
  rateDate: "2026-10-17",
  actualPayout: null,
  purposeCode: engagements.brightwellLanding.purposeCode,
  payLink: "https://www.sandbox.paypal.com/invoice/p/#BRTW0043",
  riskLevel: "watch",
};

export const okaforInvoice: InvoiceSummary = {
  id: "INV2-OKRZ-0044-E5F6-G7H8",
  number: "INV-0044",
  client: {
    name: engagements.okaforGuidelines.clientName,
    email: "accounts@okaforreyes.example.com",
    location: "Lisbon, Portugal",
  },
  work: engagements.okaforGuidelines.work,
  amount: engagements.okaforGuidelines.amount,
  issuedOn: "2026-10-01",
  dueOn: "2026-10-10",
  paidOn: null,
  paypalStatus: "UNPAID",
  dueState: "overdue",
  daysLate: 7,
  payoutInr: 68068,
  payoutSource: "estimate",
  rateDate: "2026-10-17",
  actualPayout: null,
  purposeCode: engagements.okaforGuidelines.purposeCode,
  payLink: "https://www.sandbox.paypal.com/invoice/p/#OKRZ0044",
  riskLevel: "late_payer",
};

export const northpineInvoice: InvoiceSummary = {
  id: "INV2-NPST-0045-J9K1-L2M3",
  number: "INV-0045",
  client: {
    name: engagements.northpineKit.clientName,
    email: "billing@northpine.example.com",
    location: "Toronto, Canada",
  },
  work: engagements.northpineKit.work,
  amount: engagements.northpineKit.amount,
  issuedOn: "2026-10-06",
  dueOn: "2026-10-20",
  paidOn: null,
  paypalStatus: "UNPAID",
  dueState: "due_soon",
  daysLate: 0,
  payoutInr: 22182,
  payoutSource: "estimate",
  rateDate: "2026-10-17",
  actualPayout: null,
  purposeCode: engagements.northpineKit.purposeCode,
  payLink: "https://www.sandbox.paypal.com/invoice/p/#NPST0045",
  riskLevel: "watch",
};

export const tandemInvoice: InvoiceSummary = {
  id: "INV2-TNDM-0046-N4P5-Q6R7",
  number: "INV-0046",
  client: {
    name: engagements.tandemDeck.clientName,
    email: "finance@tandemhealth.example.com",
    location: "Boston, United States",
  },
  work: engagements.tandemDeck.work,
  amount: engagements.tandemDeck.amount,
  issuedOn: "2026-10-09",
  dueOn: "2026-10-30",
  paidOn: null,
  paypalStatus: "UNPAID",
  dueState: "on_time",
  daysLate: 0,
  payoutInr: 73418,
  payoutSource: "estimate",
  rateDate: "2026-10-17",
  actualPayout: null,
  purposeCode: engagements.tandemDeck.purposeCode,
  payLink: "https://www.sandbox.paypal.com/invoice/p/#TNDM0046",
  riskLevel: null,
};

export const haldenLabelsInvoice: InvoiceSummary = {
  id: "INV2-HLDN-0042-S8T9-U1V2",
  number: "INV-0042",
  client: {
    name: "Halden Coffee Co.",
    email: "mike@haldencoffee.example",
    location: "Austin, United States",
  },
  work: "Coffee bag labels",
  amount: { currency: "USD", value: "450.00" },
  issuedOn: "2026-10-02",
  dueOn: "2026-10-16",
  paidOn: "2026-10-15",
  paypalStatus: "PAID",
  dueState: "paid",
  daysLate: 0,
  payoutInr: 35617,
  payoutSource: "paypal",
  rateDate: null,
  actualPayout: {
    fee: { currency: "USD", value: "20.10" },
    net: { currency: "USD", value: "429.90" },
    exchangeRate: 82.85,
    netInr: 35617,
    source: "paypal_capture",
    paidAt: "2026-10-15T11:42:00Z",
    transactionId: "5GX12345AB6789012",
  },
  purposeCode: "P1099",
  payLink: "https://www.sandbox.paypal.com/invoice/p/#HLDN0042",
  riskLevel: "reliable",
};

export const haldenMenuInvoice: InvoiceSummary = {
  id: "INV2-HLDN-0041-W3X4-Y5Z6",
  number: "INV-0041",
  client: {
    name: engagements.haldenMenu.clientName,
    email: "mike@haldencoffee.example",
    location: "Austin, United States",
  },
  work: engagements.haldenMenu.work,
  amount: engagements.haldenMenu.amount,
  issuedOn: "2026-09-29",
  dueOn: "2026-10-08",
  paidOn: "2026-10-07",
  paypalStatus: "PAID",
  dueState: "paid",
  daysLate: 0,
  payoutInr: 22824,
  payoutSource: "estimate",
  rateDate: "2026-10-07",
  actualPayout: null,
  purposeCode: engagements.haldenMenu.purposeCode,
  payLink: "https://www.sandbox.paypal.com/invoice/p/#HLDN0041",
  riskLevel: "reliable",
};

export const invoices: InvoiceSummary[] = [
  brightwellInvoice,
  okaforInvoice,
  northpineInvoice,
  tandemInvoice,
  haldenLabelsInvoice,
  haldenMenuInvoice,
];

export const totals: Totals = {
  outstandingInr: 228187,
  overdueInr: 132587,
  overdueCount: 2,
  paidThisMonthPayPalInr: 58441,
  paidThisMonthOutsideInr: 0,
};

export const settings: Settings = {
  ...DEFAULT_SETTINGS,
  marketRates: { USD: 88, EUR: 102, GBP: 116, CAD: 63, AUD: 57.5 },
  ratesUpdatedOn: "2026-10-16",
};

export const payoutEstimate: PayoutEstimate = {
  gross: { currency: "USD", value: "450.00" },
  fee: { currency: "USD", value: "20.10" },
  net: { currency: "USD", value: "429.90" },
  marketRate: 88,
  marketRateDate: "2026-10-16",
  marketRateSource: "ecb",
  conversionRate: 85.36,
  netInr: 36696,
  lossInr: 2904,
  lossPercent: 7.3,
};

export const haldenRisk: ClientRisk = {
  clientEmail: "mike@haldencoffee.example",
  clientName: "Halden Coffee Co.",
  invoicesConsidered: 2,
  lateCount: 0,
  averageDaysLate: 0,
  level: "reliable",
  suggestion: null,
  reason: "Both earlier invoices were paid before the due date.",
};

export const extraction: ExtractResponse = {
  draft: {
    client: {
      name: "Halden Coffee Co.",
      email: "mike@haldencoffee.example",
      location: "Austin, United States",
    },
    currency: "USD",
    dueOn: "2026-11-13",
    items: [
      {
        name: "Logo concept",
        quantity: 3,
        unitAmount: "120.00",
        sourceQuote: "Need 3 logo options ... Logos for $120 each",
      },
      {
        name: "Revision round",
        quantity: 2,
        unitAmount: "45.00",
        sourceQuote: "2 rounds of changes ... revisions $45 a round",
      },
    ],
    purposeCode: "P1099",
    purposeReason: "Logo design has no closer match on the list, so it falls under other services.",
    includeLutNote: true,
  },
  warnings: [
    "No payment terms in the chat; due date set to 14 days from today. Change it if needed.",
  ],
  risk: haldenRisk,
  masked: { emails: 1, phones: 0 },
};

export const activity: ActivityEvent[] = [
  {
    id: "evt-1004",
    kind: "paid",
    invoiceId: haldenLabelsInvoice.id,
    invoiceNumber: "INV-0042",
    clientName: "Halden Coffee Co.",
    at: "2026-10-15T11:42:00Z",
    amount: { currency: "USD", value: "450.00" },
  },
  {
    id: "evt-1003",
    kind: "viewed",
    invoiceId: tandemInvoice.id,
    invoiceNumber: "INV-0046",
    clientName: "Tandem Health",
    at: "2026-10-14T16:05:00Z",
  },
  {
    id: "evt-1002",
    kind: "overdue",
    invoiceId: brightwellInvoice.id,
    invoiceNumber: "INV-0043",
    clientName: "Brightwell Labs",
    at: "2026-10-13T00:00:00Z",
    amount: { currency: "GBP", value: "600.00" },
  },
  {
    id: "evt-1001",
    kind: "reminder_sent",
    invoiceId: okaforInvoice.id,
    invoiceNumber: "INV-0044",
    clientName: "Okafor & Reyes",
    at: "2026-10-13T09:30:00Z",
  },
];

export const exportRegister: ExportRegister = {
  month: "2026-10",
  rows: [
    {
      invoiceId: haldenMenuInvoice.id,
      invoiceNumber: "INV-0041",
      clientName: "Halden Coffee Co.",
      clientCountry: "United States",
      paidOn: "2026-10-07",
      foreign: { currency: "USD", value: "280.00" },
      fee: null,
      net: null,
      inrReceived: 22824,
      inrSource: "estimate",
      rateUsed: 85.36,
      rateDate: "2026-10-07",
      purposeCode: "P1099",
      underLut: false,
      transactionId: null,
    },
    {
      invoiceId: haldenLabelsInvoice.id,
      invoiceNumber: "INV-0042",
      clientName: "Halden Coffee Co.",
      clientCountry: "United States",
      paidOn: "2026-10-15",
      foreign: { currency: "USD", value: "450.00" },
      fee: { currency: "USD", value: "20.10" },
      net: { currency: "USD", value: "429.90" },
      inrReceived: 35617,
      inrSource: "paypal",
      rateUsed: null,
      rateDate: null,
      purposeCode: "P1099",
      underLut: true,
      transactionId: "5GX12345AB6789012",
    },
  ],
  totalInr: 58441,
  totalsByCurrency: [{ currency: "USD", value: "730.00" }],
  paypalInr: 35617,
  estimatedInr: 22824,
  missingPurposeCodes: 0,
  recordedOutsidePayPal: [],
};

export const health: HealthResponse = {
  paypal: "connected",
  ai: "ready",
  storage: "memory",
  mode: "sandbox",
  today: FIXTURE_TODAY,
  demoClock: false,
};
