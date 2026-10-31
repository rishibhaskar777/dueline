create table client_notes (
  client_key text primary key,
  notes text not null,
  updated_at timestamptz not null default now()
);
