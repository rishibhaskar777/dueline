-- A heads-up is logged with its own tone, so the check on reminder_log's tone has to allow it. This
-- only widens what the column accepts; the three tones the earlier code writes stay valid.
alter table reminder_log drop constraint if exists reminder_log_tone_check;
alter table reminder_log
  add constraint reminder_log_tone_check check (tone in ('gentle', 'firm', 'final', 'heads_up'));

-- The date a client promised to pay an invoice by, one per invoice.
create table if not exists payment_promises (
  invoice_id text primary key,
  promised_on date not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- A promised event keeps the date it carries.
alter table activity_events add column if not exists detail text;
