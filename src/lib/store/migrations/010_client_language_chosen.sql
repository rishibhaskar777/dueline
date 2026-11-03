-- Tells a language the freelancer chose from the default, so a suggestion is made only until they do.
alter table client_notes add column if not exists language_chosen boolean not null default false;
update client_notes set language_chosen = true where language <> 'en' and not language_chosen;
