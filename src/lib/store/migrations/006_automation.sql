alter table client_notes add column language text not null default 'en';

create table queue_items (
  id text primary key,
  day text not null,
  item jsonb not null,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);
create index queue_items_day on queue_items (day);

create table repeat_schedules (
  id text primary key,
  value jsonb not null,
  created_at timestamptz not null default now()
);

create table library_items (
  id text primary key,
  value jsonb not null,
  created_at timestamptz not null default now()
);
