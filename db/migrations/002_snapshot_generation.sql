begin;
alter table pethub.user_snapshots
  add column generation uuid not null default gen_random_uuid();

create or replace function pethub.version_snapshot() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.generation <> old.generation then
      raise exception 'Snapshot identity cannot change';
    end if;
    new.revision := old.revision + 1;
  else
    new.revision := 1;
    new.generation := gen_random_uuid();
  end if;
  new.updated_at := now();
  return new;
end;
$$;
commit;
