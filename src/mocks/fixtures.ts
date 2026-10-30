import {
  DEFAULT_SETTINGS,
  type ClientRisk,
  type ActivityEvent,
  type ExportRegister,
  type ExtractResponse,
  type HealthResponse,
  type InvoiceSummary,
  type PayoutEstimate,
  type ReminderDraft,
  type Settings,
  type Totals,
} from "@/types";

export const FIXTURE_TODAY = "2026-10-17";

export const brightwellInvoice: InvoiceSummary = {
  id: "INV2-BRTW-0043-A1B2-C3D4",
  number: "INV-0043",
  client: {
    name: "Brightwell Labs",
    email: "accounts@brightwell.example.com",
    location: "London, United Kingdom",
  },
  work: "Landing page UI",
  amount: { currency: "GBP", value: "600.00" },
  issuedOn: "2026-09-28",
  dueOn: "2026-10-12",
  paidOn: null,
  paypalStatus: "UNPAID",
  dueState: "overdue",
  daysLate: 5,
  payoutInr: 64519,
  actualPayout: null,
  purposeCode: "P1099",
  payLink: "https://www.sandbox.paypal.com/invoice/p/#BRTW0043",
};

export const okaforInvoice: InvoiceSummary = {
  id: "INV2-OKRZ-0044-E5F6-G7H8",
  number: "INV-0044",
  client: {
    name: "Okafor & Reyes",
    email: "accounts@okaforreyes.example.com",
    location: "Lisbon, Portugal",
  },
  work: "Brand guidelines",
  amount: { currency: "EUR", value: "720.00" },
  issuedOn: "2026-10-01",
  dueOn: "2026-10-10",
  paidOn: null,
  paypalStatus: "UNPAID",
  dueState: "overdue",
  daysLate: 7,
  payoutInr: 68068,
  actualPayout: null,
  purposeCode: "P1099",
  payLink: "https://www.sandbox.paypal.com/invoice/p/#OKRZ0044",
};

export const northpineInvoice: InvoiceSummary = {
  id: "INV2-NPST-0045-J9K1-L2M3",
  number: "INV-0045",
  client: {
    name: "Northpine Studio",
    email: "billing@northpine.example.com",
    location: "Toronto, Canada",
  },
  work: "Social media kit",
  amount: { currency: "CAD", value: "380.00" },
  issuedOn: "2026-10-06",
  dueOn: "2026-10-20",
  paidOn: null,
  paypalStatus: "UNPAID",
  dueState: "due_soon",
  daysLate: 0,
  payoutInr: 22182,
  actualPayout: null,
  purposeCode: "P1007",
  payLink: "https://www.sandbox.paypal.com/invoice/p/#NPST0045",
};

export const tandemInvoice: InvoiceSummary = {
  id: "INV2-TNDM-0046-N4P5-Q6R7",
  number: "INV-0046",
  client: {
    name: "Tandem Health",
    email: "finance@tandemhealth.example.com",
    location: "Boston, United States",
  },
  work: "Pitch deck design",
  amount: { currency: "USD", value: "900.00" },
  issuedOn: "2026-10-09",
  dueOn: "2026-10-30",
  paidOn: null,
  paypalStatus: "UNPAID",
  dueState: "on_time",
  daysLate: 0,
  payoutInr: 73418,
  actualPayout: null,
  purposeCode: "P1099",
  payLink: "https://www.sandbox.paypal.com/invoice/p/#TNDM0046",
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
  actualPayout: {
    fee: { currency: "USD", value: "20.10" },
    net: { currency: "USD", value: "429.90" },
    exchangeRate: 82.85,
    netInr: 35617,
    source: "paypal_capture",
  },
  purposeCode: "P1099",
  payLink: "https://www.sandbox.paypal.com/invoice/p/#HLDN0042",
};

export const haldenMenuInvoice: InvoiceSummary = {
  id: "INV2-HLDN-0041-W3X4-Y5Z6",
  number: "INV-0041",
  client: {
    name: "Halden Coffee Co.",
    email: "mike@haldencoffee.example",
    location: "Austin, United States",
  },
  work: "Menu redesign",
  amount: { currency: "USD", value: "280.00" },
  issuedOn: "2026-09-29",
  dueOn: "2026-10-08",
  paidOn: "2026-10-07",
  paypalStatus: "PAID",
  dueState: "paid",
  daysLate: 0,
  payoutInr: 22824,
  actualPayout: null,
  purposeCode: "P1099",
  payLink: "https://www.sandbox.paypal.com/invoice/p/#HLDN0041",
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
  paidThisMonthInr: 58441,
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
  invoicesConsidered: 2,
  lateCount: 0,
  averageDaysLate: 0,
  level: "reliable",
  suggestion: null,
  reason: "Both earlier invoices were paid before the due date.",
};

export const okaforRisk: ClientRisk = {
  clientEmail: "accounts@okaforreyes.example.com",
  invoicesConsidered: 4,
  lateCount: 3,
  averageDaysLate: 9,
  level: "late_payer",
  suggestion: { kind: "early_payment_discount", percent: 3, withinDays: 7 },
  reason: "Paid late on 3 of 4 invoices, by 9 days on average.",
};

export const risks: ClientRisk[] = [okaforRisk, haldenRisk];

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

export const reminders: ReminderDraft[] = [
  {
    invoiceId: okaforInvoice.id,
    tone: "firm",
    suggestedTone: "firm",
    subject: "Invoice INV-0044 is now 7 days overdue",
    message:
      "Hi team,\n\nInvoice INV-0044 for EUR 720.00 (Brand guidelines) was due on 10 October and is now 7 days overdue. I sent a reminder on 13 October and have not yet seen a payment.\n\nCould you please pay it through the PayPal link on the invoice this week? If something is holding it up, let me know and I will help sort it out.\n\nThank you,\nRiya",
    history: [{ tone: "gentle", sentAt: "2026-10-13T09:30:00Z" }],
  },
  {
    invoiceId: brightwellInvoice.id,
    tone: "gentle",
    suggestedTone: "gentle",
    subject: "A quick reminder about invoice INV-0043",
    message:
      "Hi team,\n\nA quick reminder that invoice INV-0043 for GBP 600.00 (Landing page UI) was due on 12 October. If it has already been paid, please ignore this note.\n\nYou can pay through the PayPal link on the invoice. Thank you!\n\nRiya",
    history: [],
  },
];

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
      invoiceId: haldenLabelsInvoice.id,
      invoiceNumber: "INV-0042",
      clientName: "Halden Coffee Co.",
      clientCountry: "United States",
      paidOn: "2026-10-15",
      foreign: { currency: "USD", value: "450.00" },
      inrReceived: 35617,
      inrSource: "paypal",
      purposeCode: "P1099",
    },
    {
      invoiceId: haldenMenuInvoice.id,
      invoiceNumber: "INV-0041",
      clientName: "Halden Coffee Co.",
      clientCountry: "United States",
      paidOn: "2026-10-07",
      foreign: { currency: "USD", value: "280.00" },
      inrReceived: 22824,
      inrSource: "estimate",
      purposeCode: "P1099",
    },
  ],
  totalInr: 58441,
};

export const health: HealthResponse = {
  paypal: "connected",
  ai: "ready",
  storage: "memory",
  mode: "sandbox",
  today: FIXTURE_TODAY,
  demoClock: false,
};
