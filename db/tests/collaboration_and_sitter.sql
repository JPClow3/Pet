begin;

-- Fixture setup
set local role pethub_app;
select set_config('app.user_id', 'user-owner-1', true);

-- Owner creates a pet collaborator invitation
insert into pethub.pet_collaborators (
  owner_user_id, pet_id, pet_name, collaborator_email, collaborator_name, role, invite_code, status
) values (
  'user-owner-1', 'pet-luna-1', 'Luna', 'co-tutor@example.com', 'Mariana', 'co_tutor', 'inv_code_12345678', 'pending'
);

-- Assert owner can read it
do $$
declare cnt integer;
begin
  select count(*) into cnt from pethub.pet_collaborators where pet_id = 'pet-luna-1';
  if cnt <> 1 then raise exception 'Expected 1 collaborator invite'; end if;
end $$;

-- Owner creates a shared care event (dose administered by owner)
insert into pethub.shared_care_events (
  pet_id, owner_user_id, actor_user_id, actor_name, actor_role, event_type, record_id, schedule_id, event_key, status, payload
) values (
  'pet-luna-1', 'user-owner-1', 'user-owner-1', 'Carlos', 'tutor', 'medication_dose', 'rec-1', 'sched-1', 'sched-1:2026-10-28T18:00', 'given', '{"title": "Amoxicilina", "amount": "1", "unit": "comp"}'::jsonb
);

-- Owner creates a pet sitter pass
insert into pethub.pet_sitter_passes (
  owner_user_id, pet_id, token_hash, pin_hash, sitter_name, pass_data, expires_at
) values (
  'user-owner-1', 'pet-luna-1', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', null, 'Hotel Cão Feliz', '{"pet": {"name": "Luna", "species": "cao"}}'::jsonb, now() + interval '3 days'
);

-- Test Sitter Reader access
set local role pethub_card_reader;
select set_config('app.sitter_pass_hash', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', true);

do $$
declare cnt integer;
begin
  select count(*) into cnt from pethub.pet_sitter_passes where token_hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  if cnt <> 1 then raise exception 'Expected sitter reader to find pass'; end if;
end $$;

-- Sitter logs a care event (e.g., meal served)
insert into pethub.shared_care_events (
  pet_id, owner_user_id, actor_user_id, actor_name, actor_role, event_type, event_key, status, payload
) values (
  'pet-luna-1', 'user-owner-1', null, 'Hotel Cão Feliz', 'cuidador', 'meal', 'meal:2026-10-28T19:00', 'served', '{"description": "150g ração seca"}'::jsonb
);

rollback;
