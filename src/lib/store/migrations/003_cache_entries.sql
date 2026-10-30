create table cache_entries (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz not null
);
