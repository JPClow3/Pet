begin;
create schema if not exists pethub;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'pethub_app') then
    create role pethub_app nologin nobypassrls;
  end if;
  execute format('grant pethub_app to %I', current_user);
end $$;
grant usage on schema pethub to pethub_app;
create table pethub.user_snapshots (
  user_id text primary key check (length(user_id) between 1 and 200),
  snapshot jsonb not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint snapshot_format check ((jsonb_typeof(snapshot) = 'object'
    and snapshot ->> 'format' = 'pethub-backup' and snapshot ->> 'version' = '1'
    and octet_length(snapshot::text) <= 20971520) is true)
);
alter table pethub.user_snapshots enable row level security;
alter table pethub.user_snapshots force row level security;
revoke all on pethub.user_snapshots from public;
grant select, insert, update, delete on pethub.user_snapshots to pethub_app;
create policy own_snapshot on pethub.user_snapshots to pethub_app
  using (user_id = nullif(current_setting('app.user_id', true), ''))
  with check (user_id = nullif(current_setting('app.user_id', true), ''));
create function pethub.version_snapshot() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id then raise exception 'Owner cannot change'; end if;
    new.revision := old.revision + 1;
  else new.revision := 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function pethub.version_snapshot() from public;
create trigger version_snapshot before insert or update on pethub.user_snapshots
  for each row execute function pethub.version_snapshot();
commit;
