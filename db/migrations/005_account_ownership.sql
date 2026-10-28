begin;

-- Managed Better Auth permits references to neon_auth.user's primary key.
-- Keep existing text owner IDs and RLS contracts while making identity removal
-- atomically remove backups and published cards, including direct provider deletion.
-- Deferred checks let rollback-only fixtures exercise RLS without creating users.
alter table pethub.user_snapshots
  add column owner_auth_id uuid generated always as (user_id::uuid) stored,
  add constraint snapshots_auth_owner
    foreign key (owner_auth_id) references neon_auth."user"(id)
    on delete cascade deferrable initially deferred;
create index snapshots_auth_owner_idx on pethub.user_snapshots(owner_auth_id);

alter table pethub.public_cards
  add column owner_auth_id uuid generated always as (user_id::uuid) stored,
  add constraint cards_auth_owner
    foreign key (owner_auth_id) references neon_auth."user"(id)
    on delete cascade deferrable initially deferred;
create index cards_auth_owner_idx on pethub.public_cards(owner_auth_id);

commit;
