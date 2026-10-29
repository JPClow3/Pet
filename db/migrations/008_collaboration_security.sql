begin;

alter table pethub.shared_care_events drop constraint shared_care_events_status_check;
alter table pethub.shared_care_events add constraint shared_care_events_status_check
  check (status in ('given', 'skipped', 'missed', 'unrecorded', 'served', 'completed'));
-- Older sitter clients used a colon before the time instead of the canonical T.
update pethub.shared_care_events set event_key = regexp_replace(event_key, ':(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2})$', ':\1T\2')
  where event_type = 'medication_dose' and event_key ~ ':\d{4}-\d{2}-\d{2}:\d{2}:\d{2}$';

-- Keep the previous rows for review while making an occurrence idempotent.
create table pethub.shared_care_event_duplicates (like pethub.shared_care_events including defaults);
revoke all on pethub.shared_care_event_duplicates from public, pethub_app, pethub_card_reader;
with ranked as (
  select id, row_number() over (
    partition by owner_user_id, pet_id, event_key order by occurred_at, created_at, id
  ) as position from pethub.shared_care_events
), moved as (
  delete from pethub.shared_care_events e using ranked r
  where e.id = r.id and r.position > 1 returning e.*
)
insert into pethub.shared_care_event_duplicates select * from moved;
-- Pet IDs are local/importable; access and uniqueness must include their owner.
create unique index shared_care_occurrence_unique on pethub.shared_care_events(owner_user_id, pet_id, event_key);

alter table pethub.pet_sitter_passes drop constraint pet_sitter_passes_pin_hash_check;
alter table pethub.pet_sitter_passes add constraint pet_sitter_passes_pin_hash_check
  check (pin_hash is null or pin_hash ~ '^[a-f0-9]{64}$'
    or pin_hash ~ '^pbkdf2-sha256:100000:[a-f0-9]{32}:[a-f0-9]{64}$');
alter table pethub.pet_sitter_passes
  add column pin_attempt_count integer not null default 0 check (pin_attempt_count >= 0),
  add column pin_window_started_at timestamptz not null default now();
-- Column grants also cover every column used by the public server queries.
grant select(token_hash, owner_user_id, pin_attempt_count, pin_window_started_at)
  on pethub.pet_sitter_passes to pethub_card_reader;
grant update(pin_attempt_count, pin_window_started_at) on pethub.pet_sitter_passes to pethub_card_reader;
create policy sitter_pin_budget on pethub.pet_sitter_passes for update to pethub_card_reader
  using (token_hash = nullif(current_setting('app.sitter_pass_hash', true), '')
    and revoked_at is null and expires_at > now())
  with check (token_hash = nullif(current_setting('app.sitter_pass_hash', true), '')
    and revoked_at is null and expires_at > now());

create function pethub.owns_cloud_pet(target_pet_id text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from pethub.user_snapshots s,
      jsonb_array_elements(coalesce(s.snapshot->'pets', '[]'::jsonb)) pet
    where s.user_id = nullif(current_setting('app.user_id', true), '')
      and pet->>'id' = target_pet_id
  );
$$;
revoke all on function pethub.owns_cloud_pet(text) from public;
grant execute on function pethub.owns_cloud_pet(text) to pethub_app;

drop policy own_or_collaborate_collabs on pethub.pet_collaborators;
create policy read_collaborators on pethub.pet_collaborators for select to pethub_app
  using (owner_user_id = nullif(current_setting('app.user_id', true), '')
    or collaborator_user_id = nullif(current_setting('app.user_id', true), '')
    or (status = 'pending' and collaborator_email = nullif(current_setting('app.user_email', true), '')));
create policy invite_collaborator on pethub.pet_collaborators for insert to pethub_app
  with check (owner_user_id = nullif(current_setting('app.user_id', true), '')
    and pethub.owns_cloud_pet(pet_id) and status = 'pending' and collaborator_user_id is null);
create policy accept_or_revoke_collaborator on pethub.pet_collaborators for update to pethub_app
  using (owner_user_id = nullif(current_setting('app.user_id', true), '')
    or (status = 'pending' and collaborator_email = nullif(current_setting('app.user_email', true), '')))
  with check (owner_user_id = nullif(current_setting('app.user_id', true), '')
    or (collaborator_email = nullif(current_setting('app.user_email', true), '')
      and collaborator_user_id = nullif(current_setting('app.user_id', true), '') and status = 'accepted'));
create policy remove_collaborator on pethub.pet_collaborators for delete to pethub_app
  using (owner_user_id = nullif(current_setting('app.user_id', true), '')
    or collaborator_user_id = nullif(current_setting('app.user_id', true), ''));

-- Acceptance cannot rewrite the invitation into a different pet, owner or role.
create function pethub.guard_collaborator_update() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.id <> old.id or new.owner_user_id <> old.owner_user_id or new.pet_id <> old.pet_id
    or new.invite_code <> old.invite_code or new.collaborator_email <> old.collaborator_email
    or new.role <> old.role or new.pet_name <> old.pet_name
    or new.collaborator_name <> old.collaborator_name or new.created_at <> old.created_at then
    raise exception 'Invitation identity cannot change' using errcode = '42501';
  end if;
  if old.owner_user_id = nullif(current_setting('app.user_id', true), '') then
    if new.collaborator_user_id is distinct from old.collaborator_user_id
      or new.status not in (old.status, 'revoked') then
      raise exception 'Owner can only revoke an invitation' using errcode = '42501';
    end if;
  elsif not (old.status = 'pending' and new.status = 'accepted'
    and old.collaborator_email = nullif(current_setting('app.user_email', true), '')
    and new.collaborator_user_id = nullif(current_setting('app.user_id', true), '')
    and old.owner_user_id <> new.collaborator_user_id) then
    raise exception 'Invitation cannot be accepted by this user' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function pethub.guard_collaborator_update() from public;
create trigger guard_collaborator_update before update on pethub.pet_collaborators
  for each row execute function pethub.guard_collaborator_update();

drop policy access_shared_care_events on pethub.shared_care_events;
create policy read_shared_care on pethub.shared_care_events for select to pethub_app
  using (owner_user_id = nullif(current_setting('app.user_id', true), '')
    or exists (select 1 from pethub.pet_collaborators c
      where c.pet_id = shared_care_events.pet_id and c.owner_user_id = shared_care_events.owner_user_id
        and c.collaborator_user_id = nullif(current_setting('app.user_id', true), '') and c.status = 'accepted'));
create policy write_shared_care on pethub.shared_care_events for insert to pethub_app
  with check (actor_user_id = nullif(current_setting('app.user_id', true), '') and (
    (owner_user_id = nullif(current_setting('app.user_id', true), '') and pethub.owns_cloud_pet(pet_id) and actor_role = 'tutor')
    or exists (select 1 from pethub.pet_collaborators c
      where c.pet_id = shared_care_events.pet_id and c.owner_user_id = shared_care_events.owner_user_id
        and c.collaborator_user_id = nullif(current_setting('app.user_id', true), '')
        and c.status = 'accepted' and c.role = shared_care_events.actor_role)));
create policy correct_shared_care on pethub.shared_care_events for update to pethub_app
  using (owner_user_id = nullif(current_setting('app.user_id', true), '')
    or exists (select 1 from pethub.pet_collaborators c
      where c.pet_id = shared_care_events.pet_id and c.owner_user_id = shared_care_events.owner_user_id
        and c.collaborator_user_id = nullif(current_setting('app.user_id', true), '') and c.status = 'accepted'))
  with check (actor_user_id = nullif(current_setting('app.user_id', true), '') and (
    (owner_user_id = nullif(current_setting('app.user_id', true), '') and pethub.owns_cloud_pet(pet_id) and actor_role = 'tutor')
    or exists (select 1 from pethub.pet_collaborators c
      where c.pet_id = shared_care_events.pet_id and c.owner_user_id = shared_care_events.owner_user_id
        and c.collaborator_user_id = nullif(current_setting('app.user_id', true), '')
        and c.status = 'accepted' and c.role = shared_care_events.actor_role)));

drop policy sitter_insert_care_event on pethub.shared_care_events;
drop policy sitter_read_care_events on pethub.shared_care_events;
create policy sitter_insert_care_event on pethub.shared_care_events for insert to pethub_card_reader
  with check (actor_role = 'cuidador' and actor_user_id is null and event_type in ('medication_dose', 'meal')
    and exists (select 1 from pethub.pet_sitter_passes p
      where p.pet_id = shared_care_events.pet_id and p.owner_user_id = shared_care_events.owner_user_id
        and p.token_hash = nullif(current_setting('app.sitter_pass_hash', true), '')
        and (p.pin_hash is null or p.pin_hash = nullif(current_setting('app.sitter_verified_pin_hash', true), ''))
        and p.revoked_at is null and p.expires_at > now()));
create policy sitter_read_care_events on pethub.shared_care_events for select to pethub_card_reader
  using (exists (select 1 from pethub.pet_sitter_passes p
    where p.pet_id = shared_care_events.pet_id and p.owner_user_id = shared_care_events.owner_user_id
      and p.token_hash = nullif(current_setting('app.sitter_pass_hash', true), '')
      and (p.pin_hash is null or p.pin_hash = nullif(current_setting('app.sitter_verified_pin_hash', true), ''))
      and p.revoked_at is null and p.expires_at > now()));

commit;
