begin;

-- Collaboration: allows multiple Neon accounts to co-manage a pet and sync care status
create table if not exists pethub.pet_collaborators (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null check(length(owner_user_id) between 1 and 200),
  owner_auth_id uuid generated always as (owner_user_id::uuid) stored constraint pet_collaborators_auth_owner references neon_auth."user"(id) on delete cascade deferrable initially deferred,
  pet_id text not null check(length(pet_id) between 1 and 100),
  pet_name text not null check(length(pet_name) between 1 and 60),
  collaborator_email text not null check(length(collaborator_email) between 3 and 120),
  collaborator_user_id text check(collaborator_user_id is null or length(collaborator_user_id) between 1 and 200),
  collaborator_name text not null check(length(collaborator_name) between 1 and 80),
  role text not null check(role in ('co_tutor', 'cuidador')),
  invite_code text not null unique check(length(invite_code) between 8 and 100),
  status text not null default 'pending' check(status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists pet_collaborators_owner_idx on pethub.pet_collaborators(owner_user_id, pet_id);
create index if not exists pet_collaborators_collab_user_idx on pethub.pet_collaborators(collaborator_user_id) where status = 'accepted';
create index if not exists pet_collaborators_email_idx on pethub.pet_collaborators(collaborator_email);

-- Shared Care Events: real-time care sync between co-tutors and sitters (prevents double dosing!)
create table if not exists pethub.shared_care_events (
  id uuid primary key default gen_random_uuid(),
  pet_id text not null check(length(pet_id) between 1 and 100),
  owner_user_id text not null check(length(owner_user_id) between 1 and 200),
  actor_user_id text check(actor_user_id is null or length(actor_user_id) between 1 and 200),
  actor_name text not null check(length(actor_name) between 1 and 80),
  actor_role text not null default 'tutor' check(actor_role in ('tutor', 'co_tutor', 'cuidador')),
  event_type text not null check(event_type in ('medication_dose', 'meal', 'care_note', 'walk')),
  record_id text check(record_id is null or length(record_id) between 1 and 100),
  schedule_id text check(schedule_id is null or length(schedule_id) between 1 and 100),
  event_key text not null check(length(event_key) between 1 and 200),
  status text not null check(status in ('given', 'skipped', 'missed', 'served', 'completed')),
  payload jsonb not null default '{}'::jsonb check(octet_length(payload::text) <= 4096),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists shared_care_pet_time_idx on pethub.shared_care_events(pet_id, occurred_at desc);
create index if not exists shared_care_event_key_idx on pethub.shared_care_events(pet_id, event_key);

-- Pet Sitter Passes: temporary, time-bounded or PIN-protected caregiver access
create table if not exists pethub.pet_sitter_passes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null check(length(owner_user_id) between 1 and 200),
  owner_auth_id uuid generated always as (owner_user_id::uuid) stored constraint sitter_passes_auth_owner references neon_auth."user"(id) on delete cascade deferrable initially deferred,
  pet_id text not null check(length(pet_id) between 1 and 100),
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  pin_hash text check(pin_hash is null or pin_hash ~ '^[a-f0-9]{64}$'),
  sitter_name text check(sitter_name is null or length(sitter_name) <= 80),
  pass_data jsonb not null check(octet_length(pass_data::text) <= 16384),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, pet_id)
);

create index if not exists sitter_passes_token_idx on pethub.pet_sitter_passes(token_hash) where revoked_at is null;

-- Enable RLS
alter table pethub.pet_collaborators enable row level security;
alter table pethub.pet_collaborators force row level security;

alter table pethub.shared_care_events enable row level security;
alter table pethub.shared_care_events force row level security;

alter table pethub.pet_sitter_passes enable row level security;
alter table pethub.pet_sitter_passes force row level security;

-- Grants
grant select, insert, update, delete on pethub.pet_collaborators to pethub_app;
grant select, insert, update, delete on pethub.shared_care_events to pethub_app;
grant select, insert, update, delete on pethub.pet_sitter_passes to pethub_app;

-- Public sitter card reader
grant select(id, pet_id, pin_hash, sitter_name, pass_data, expires_at, revoked_at, updated_at) on pethub.pet_sitter_passes to pethub_card_reader;
grant insert, select on pethub.shared_care_events to pethub_card_reader;

-- Policies for pethub_app
create policy own_or_collaborate_collabs on pethub.pet_collaborators to pethub_app
  using (
    owner_user_id = nullif(current_setting('app.user_id', true), '')
    or collaborator_user_id = nullif(current_setting('app.user_id', true), '')
    or collaborator_email = nullif(current_setting('app.user_email', true), '')
  )
  with check (
    owner_user_id = nullif(current_setting('app.user_id', true), '')
    or collaborator_user_id = nullif(current_setting('app.user_id', true), '')
  );

create policy access_shared_care_events on pethub.shared_care_events to pethub_app
  using (
    owner_user_id = nullif(current_setting('app.user_id', true), '')
    or exists (
      select 1 from pethub.pet_collaborators c
      where c.pet_id = shared_care_events.pet_id
        and c.collaborator_user_id = nullif(current_setting('app.user_id', true), '')
        and c.status = 'accepted'
    )
  )
  with check (
    owner_user_id = nullif(current_setting('app.user_id', true), '')
    or exists (
      select 1 from pethub.pet_collaborators c
      where c.pet_id = shared_care_events.pet_id
        and c.collaborator_user_id = nullif(current_setting('app.user_id', true), '')
        and c.status = 'accepted'
    )
  );

create policy own_sitter_passes on pethub.pet_sitter_passes to pethub_app
  using (owner_user_id = nullif(current_setting('app.user_id', true), ''))
  with check (owner_user_id = nullif(current_setting('app.user_id', true), ''));

-- Sitter reader policy for public sitter view
create policy read_sitter_pass on pethub.pet_sitter_passes for select to pethub_card_reader
  using (
    token_hash = nullif(current_setting('app.sitter_pass_hash', true), '')
    and revoked_at is null
    and expires_at > now()
  );

create policy sitter_insert_care_event on pethub.shared_care_events for insert to pethub_card_reader
  with check (
    actor_role = 'cuidador'
    and exists (
      select 1 from pethub.pet_sitter_passes p
      where p.pet_id = shared_care_events.pet_id
        and p.token_hash = nullif(current_setting('app.sitter_pass_hash', true), '')
        and p.revoked_at is null
        and p.expires_at > now()
    )
  );

create policy sitter_read_care_events on pethub.shared_care_events for select to pethub_card_reader
  using (
    exists (
      select 1 from pethub.pet_sitter_passes p
      where p.pet_id = shared_care_events.pet_id
        and p.token_hash = nullif(current_setting('app.sitter_pass_hash', true), '')
        and p.revoked_at is null
        and p.expires_at > now()
    )
  );

commit;
