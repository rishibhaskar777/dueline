create table schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

create table idempotency_requests (
  request_id text primary key,
  body_hash text not null,
  status text not null check (status in ('in_progress', 'completed')),
  result jsonb,
  created_at timestamptz not null default now()
);

create table webhook_events (
  event_id text primary key,
  received_at timestamptz not null default now()
);

create table activity_events (
  id text primary key,
  kind text not null,
  invoice_id text not null,
  invoice_number text not null,
  client_name text not null,
  at timestamptz not null,
  amount jsonb
);

create index activity_events_at_idx on activity_events (at desc);

create table reminder_log (
  id bigserial primary key,
  invoice_id text not null,
  tone text not null check (tone in ('gentle', 'firm', 'final')),
  sent_at timestamptz not null default now()
);

create index reminder_log_invoice_idx on reminder_log (invoice_id, sent_at);

create table settings (
  id smallint primary key default 1 check (id = 1),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null
);

create table exchange_rates (
  currency text not null,
  on_date date not null,
  rate numeric(14, 6) not null,
  primary key (currency, on_date)
);

create table actual_payouts (
  invoice_id text primary key,
  payout jsonb not null,
  fetched_at timestamptz not null default now()
);
