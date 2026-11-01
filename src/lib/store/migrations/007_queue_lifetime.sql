alter table queue_items add column if not exists kind text;
update queue_items set kind = item->>'kind' where kind is null;
update queue_items set kind = 'reminder' where kind is null;
alter table queue_items alter column kind set not null;

-- Old reminder IDs end in a day; the next daily run writes them again without it.
delete from queue_items where kind = 'reminder';

-- A dismissed retainer is now deleted rather than flagged. The column may already be gone.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = current_schema() and table_name = 'queue_items' and column_name = 'dismissed'
  ) then
    delete from queue_items where dismissed;
  end if;
end
$$;

update queue_items set item = item - 'day' where item ? 'day';

drop index if exists queue_items_day;
alter table queue_items drop column if exists day;
alter table queue_items drop column if exists dismissed;
