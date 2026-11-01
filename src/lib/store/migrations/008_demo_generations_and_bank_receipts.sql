create table if not exists demo_generation (
  id smallint primary key default 1 check (id = 1),
  generation integer not null,
  seeded_on date not null,
  updated_at timestamptz not null default now()
);

create table if not exists demo_hidden_invoices (
  invoice_id text primary key,
  hidden_at timestamptz not null default now()
);

create table if not exists bank_receipts (
  invoice_id text primary key,
  reference text not null check (char_length(reference) between 1 and 40),
  updated_at timestamptz not null default now()
);

-- How a reminder reached the client: PayPal's reminder, or the freelancer's own email.
alter table reminder_log
  add column if not exists channel text not null default 'paypal' check (channel in ('paypal', 'email'));
