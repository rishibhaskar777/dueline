-- A client merged into another: invoices under from_key count as into_key in Dueline's own views.
-- The name and email of the merged client are kept so the merge can be shown and undone.
create table if not exists client_aliases (
  from_key text primary key,
  into_key text not null check (into_key <> from_key),
  from_name text not null,
  from_email text not null,
  created_at timestamptz not null default now()
);

-- One-off facts about the app, such as "the export register was downloaded".
create table if not exists app_flags (
  name text primary key,
  set_at timestamptz not null default now()
);
