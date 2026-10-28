begin;
create role pethub_card_reader nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
grant usage on schema pethub to pethub_card_reader;
do $$ begin
  execute format('grant pethub_card_reader to %I',current_user);
  if exists(select 1 from pg_roles where rolname='pethub_api') then
    grant pethub_card_reader to pethub_api;
  end if;
end $$;

create table pethub.public_cards (
  id uuid primary key default gen_random_uuid(),
  user_id text not null check(length(user_id) between 1 and 200),
  pet_id text not null check(length(pet_id) between 1 and 100),
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  token_version uuid not null default gen_random_uuid(),
  revision integer not null default 1 check(revision > 0),
  card jsonb,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id,pet_id),
  check(expires_at <= updated_at + interval '90 days'),
  constraint approved_card check ((
    (card is null and revoked_at is not null) or
    (jsonb_typeof(card)='object' and card->>'v'='1'
      and card ?& array['name','species','breed','city','lost','health','contact','generatedAt']
      and card - array['v','name','species','breed','city','lost','health','contact','generatedAt'] = '{}'::jsonb
      and octet_length(card::text)<=8192)
  ) is true)
);
alter table pethub.public_cards enable row level security;
alter table pethub.public_cards force row level security;
revoke all on pethub.public_cards from public;
grant select,insert,update on pethub.public_cards to pethub_app;
grant select(card,expires_at,updated_at,token_hash) on pethub.public_cards to pethub_card_reader;
create policy own_public_card on pethub.public_cards to pethub_app
  using(user_id=nullif(current_setting('app.user_id',true),''))
  with check(user_id=nullif(current_setting('app.user_id',true),''));
create policy read_public_card on pethub.public_cards for select to pethub_card_reader
  using(token_hash=nullif(current_setting('app.public_card_hash',true),'') and revoked_at is null and expires_at>now());

create function pethub.version_public_card() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' then
    if new.id<>old.id or new.user_id<>old.user_id or new.pet_id<>old.pet_id then
      raise exception 'Card ownership cannot change';
    end if;
    new.revision:=old.revision+1;
    new.token_version:=case when new.token_hash<>old.token_hash then gen_random_uuid() else old.token_version end;
  else
    new.id:=gen_random_uuid();
    new.revision:=1;
    new.token_version:=gen_random_uuid();
  end if;
  new.updated_at:=now();
  return new;
end;
$$;
revoke all on function pethub.version_public_card() from public;
create trigger version_public_card before insert or update on pethub.public_cards
  for each row execute function pethub.version_public_card();
commit;
