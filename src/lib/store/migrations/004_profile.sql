create table profile (
  id smallint primary key default 1 check (id = 1),
  value jsonb not null,
  updated_at timestamptz not null default now()
);
