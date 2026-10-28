begin;
set local plpgsql.check_asserts = on;
set local role pethub_app;

do $$ declare contract_count integer; begin
  select count(*) into contract_count
  from pg_constraint c
  join pg_attribute child on child.attrelid=c.conrelid and c.conkey=array[child.attnum]
  join pg_attribute parent on parent.attrelid=c.confrelid and c.confkey=array[parent.attnum]
  where c.contype='f' and c.condeferrable and c.condeferred and c.convalidated
    and c.confdeltype='c' and c.confrelid=(select r.oid from pg_class r join pg_namespace n on n.oid=r.relnamespace where n.nspname='neon_auth' and r.relname='user')
    and parent.attname='id' and parent.atttypid='uuid'::regtype
    and child.attname='owner_auth_id' and child.attgenerated='s'
    and child.atttypid='uuid'::regtype
    and exists(select 1 from pg_constraint pk where pk.conrelid=c.confrelid and pk.contype='p' and pk.conkey=c.confkey)
    and ((c.conrelid='pethub.user_snapshots'::regclass and c.conname='snapshots_auth_owner')
      or (c.conrelid='pethub.public_cards'::regclass and c.conname='cards_auth_owner'));
  assert contract_count=2, 'both live tables have validated deferred cascading identity foreign keys';
  assert (select count(*)=2 from pg_indexes where schemaname='pethub'
    and indexname in ('snapshots_auth_owner_idx','cards_auth_owner_idx')
    and indexdef like '%(owner_auth_id)%'), 'identity cleanup has supporting indexes';
end $$;

do $$ declare owner_a uuid:=gen_random_uuid(); owner_b uuid:=gen_random_uuid(); begin
  -- Exercise generated-column cascade behavior on isolated temporary tables.
  -- No row is inserted, updated, or deleted in the managed neon_auth schema.
  create temporary table lifecycle_test_parent(id uuid primary key) on commit drop;
  create temporary table lifecycle_test_child(
    user_id text primary key,
    owner_auth_id uuid generated always as (user_id::uuid) stored,
    foreign key(owner_auth_id) references lifecycle_test_parent(id)
      on delete cascade deferrable initially deferred
  ) on commit drop;
  insert into lifecycle_test_parent values(owner_a),(owner_b);
  insert into lifecycle_test_child(user_id) values(owner_a::text),(owner_b::text);
  delete from lifecycle_test_parent where id=owner_a;
  assert not exists(select 1 from lifecycle_test_child where user_id=owner_a::text), 'deleting a parent removes its generated-owner child';
  assert exists(select 1 from lifecycle_test_child where user_id=owner_b::text), 'other owner remains intact';
end $$;
rollback;
