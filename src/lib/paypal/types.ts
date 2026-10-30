type PayPalInvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "SCHEDULED"
  | "PAID"
  | "MARKED_AS_PAID"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_PAID"
  | "PARTIALLY_REFUNDED"
  | "MARKED_AS_REFUNDED"
  | "UNPAID"
  | "PAYMENT_PENDING";

interface PayPalMoney {
  currency_code: string;
  value: string;
}

interface PayPalPaymentTerm {
  term_type?: string;
  due_date?: string;
}

interface PayPalRecipient {
  billing_info: {
    email_address: string;
    name?: { given_name?: string; surname?: string };
    business_name?: string;
  };
}

interface PayPalItem {
  name: string;
  description?: string;
  quantity: string;
  unit_amount: PayPalMoney;
}

export interface PayPalPayment {
  payment_id?: string;
  payment_date?: string;
  method?: string;
  amount?: PayPalMoney;
  note?: string;
}

export interface PayPalInvoice {
  id: string;
  status: PayPalInvoiceStatus;
  detail: {
    invoice_number: string;
    reference?: string;
    invoice_date: string;
    currency_code: string;
    note?: string;
    memo?: string;
    payment_term?: PayPalPaymentTerm;
    metadata?: {
      create_time?: string;
      recipient_view_url?: string;
      invoicer_view_url?: string;
    };
  };
  invoicer?: { email_address?: string };
  primary_recipients?: PayPalRecipient[];
  items?: PayPalItem[];
  amount?: PayPalMoney;
  payments?: { paid_amount?: PayPalMoney; transactions?: PayPalPayment[] };
}

export interface PayPalInvoiceInput {
  detail: {
    invoice_number: string;
    reference?: string;
    invoice_date: string;
    currency_code: string;
    note?: string;
    memo?: string;
    payment_term: PayPalPaymentTerm;
  };
  primary_recipients: PayPalRecipient[];
  items: PayPalItem[];
  amount?: { breakdown: { discount: { invoice_discount: { percent: string } } } };
}

export interface PayPalInvoiceList {
  items?: PayPalInvoice[];
  total_items?: number;
  total_pages?: number;
}
