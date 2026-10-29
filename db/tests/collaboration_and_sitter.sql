begin;
set local plpgsql.check_asserts = on;
select set_config('pethub.test_owner', gen_random_uuid()::text, true);
select set_config('pethub.test_collaborator', gen_random_uuid()::text, true);
select set_config('pethub.test_stranger', gen_random_uuid()::text, true);
set local role pethub_app;
select set_config('app.user_id', current_setting('pethub.test_owner'), true);
do $$ begin
  insert into pethub.user_snapshots(user_id, snapshot) values (current_setting('app.user_id'),
    '{"format":"pethub-backup","version":2,"pets":[{"id":"pet-rls-fixture","name":"Luna"}]}');
  insert into pethub.pet_collaborators(owner_user_id, pet_id, pet_name, collaborator_email, collaborator_name, role, invite_code)
    values (current_setting('app.user_id'), 'pet-rls-fixture', 'Luna', 'collaborator@example.test', 'Co-tutora', 'co_tutor', 'inv_fixture_collaborator');
  insert into pethub.shared_care_events(pet_id, owner_user_id, actor_user_id, actor_name, actor_role, event_type, record_id, schedule_id, event_key, status, payload)
    values ('pet-rls-fixture', current_setting('app.user_id'), current_setting('app.user_id'), 'Tutor', 'tutor',
      'medication_dose', 'rec-fixture', 'sched-fixture', 'sched-fixture:2026-10-28T08:00', 'given', '{"eventId":"initial-dose"}');
  insert into pethub.pet_sitter_passes(owner_user_id, pet_id, token_hash, pass_data, expires_at)
    values (current_setting('app.user_id'), 'pet-rls-fixture', repeat('a',64), '{"v":1}', now() + interval '3 days');
end $$;
select set_config('app.user_id', current_setting('pethub.test_collaborator'), true);
select set_config('app.user_email', 'stranger@example.test', true);
do $$ declare affected integer; begin
  assert (select count(*) = 0 from pethub.shared_care_events), 'uninvited user cannot read care';
  begin
    insert into pethub.pet_collaborators(owner_user_id, pet_id, pet_name, collaborator_email, collaborator_name, collaborator_user_id, role, invite_code, status)
      values (current_setting('pethub.test_owner'), 'pet-rls-fixture', 'Luna', 'stranger@example.test', 'Attacker', current_setting('app.user_id'), 'co_tutor', 'inv_self_grant', 'accepted');
    raise exception 'self-granted collaboration accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into pethub.pet_collaborators(owner_user_id, pet_id, pet_name, collaborator_email, collaborator_name, role, invite_code)
      values (current_setting('app.user_id'), 'pet-rls-fixture', 'Luna', 'stranger@example.test', 'Attacker', 'co_tutor', 'inv_false_owner');
    raise exception 'invitation for an unowned pet accepted';
  exception when insufficient_privilege then null; end;
  update pethub.pet_collaborators set status = 'accepted', collaborator_user_id = current_setting('app.user_id') where invite_code = 'inv_fixture_collaborator';
  get diagnostics affected = row_count;
  assert affected = 0, 'invite code alone cannot authorize acceptance';
end $$;
select set_config('app.user_email', 'collaborator@example.test', true);
do $$ declare affected integer; begin
  update pethub.pet_collaborators set status = 'accepted', collaborator_user_id = current_setting('app.user_id'), accepted_at = now()
    where invite_code = 'inv_fixture_collaborator';
  get diagnostics affected = row_count;
  assert affected = 1, 'matching email can accept the invitation';
  assert (select count(*) = 1 from pethub.shared_care_events), 'accepted collaborator reads owner care';
  begin
    update pethub.pet_collaborators set pet_id = 'another-pet' where invite_code = 'inv_fixture_collaborator';
    get diagnostics affected = row_count;
    assert affected = 0, 'accepted collaborator cannot rewrite the invitation';
  exception when insufficient_privilege then null; end;
  insert into pethub.shared_care_events(pet_id, owner_user_id, actor_user_id, actor_name, actor_role, event_type, event_key, status)
    values ('pet-rls-fixture', current_setting('pethub.test_owner'), current_setting('app.user_id'), 'Co-tutora', 'co_tutor', 'medication_dose', 'sched-fixture:2026-10-28T08:00', 'given')
    on conflict (owner_user_id, pet_id, event_key) do nothing;
  assert (select count(*) = 1 from pethub.shared_care_events), 'retry does not duplicate the dose';
  insert into pethub.shared_care_events(pet_id, owner_user_id, actor_user_id, actor_name, actor_role, event_type, event_key, status, payload)
    values ('pet-rls-fixture', current_setting('pethub.test_owner'), current_setting('app.user_id'), 'Co-tutora', 'co_tutor', 'medication_dose', 'sched-fixture:2026-10-28T08:00', 'skipped', '{"eventId":"corrected-dose","correctsId":"initial-dose"}')
    on conflict (owner_user_id, pet_id, event_key) do update set
      actor_user_id = excluded.actor_user_id, actor_name = excluded.actor_name, actor_role = excluded.actor_role,
      status = excluded.status, payload = excluded.payload
    where coalesce(shared_care_events.payload->>'eventId', 'shared-' || shared_care_events.id::text) = excluded.payload->>'correctsId';
  get diagnostics affected = row_count;
  assert affected = 1, 'collaborator can correct the expected event';
  insert into pethub.shared_care_events(pet_id, owner_user_id, actor_user_id, actor_name, actor_role, event_type, event_key, status, payload)
    values ('pet-rls-fixture', current_setting('pethub.test_owner'), current_setting('app.user_id'), 'Co-tutora', 'co_tutor', 'medication_dose', 'sched-fixture:2026-10-28T08:00', 'given', '{"eventId":"stale-dose","correctsId":"initial-dose"}')
    on conflict (owner_user_id, pet_id, event_key) do update set status = excluded.status, payload = excluded.payload
    where coalesce(shared_care_events.payload->>'eventId', 'shared-' || shared_care_events.id::text) = excluded.payload->>'correctsId';
  get diagnostics affected = row_count;
  assert affected = 0, 'stale correction cannot overwrite a newer event';
  begin
    insert into pethub.shared_care_events(pet_id, owner_user_id, actor_user_id, actor_name, actor_role, event_type, event_key, status)
      values ('pet-rls-fixture', current_setting('pethub.test_owner'), current_setting('pethub.test_owner'), 'Forged tutor', 'tutor', 'meal', 'forged-actor', 'served');
    raise exception 'forged actor accepted';
  exception when insufficient_privilege then null; end;
  -- A known pet ID copied into another backup still has a different owner.
  insert into pethub.user_snapshots(user_id, snapshot) values (current_setting('app.user_id'),
    '{"format":"pethub-backup","version":2,"pets":[{"id":"pet-rls-fixture","name":"Copy"}]}');
  insert into pethub.pet_collaborators(owner_user_id, pet_id, pet_name, collaborator_email, collaborator_name, role, invite_code)
    values (current_setting('app.user_id'), 'pet-rls-fixture', 'Copy', 'stranger@example.test', 'Other account', 'co_tutor', 'inv_other_namespace');
end $$;
select set_config('app.user_id', current_setting('pethub.test_stranger'), true);
select set_config('app.user_email', 'stranger@example.test', true);
do $$ begin
  update pethub.pet_collaborators set status = 'accepted', collaborator_user_id = current_setting('app.user_id') where invite_code = 'inv_other_namespace';
  assert (select count(*) = 0 from pethub.shared_care_events), 'same pet ID under another owner does not expose care';
  begin
    insert into pethub.shared_care_events(pet_id, owner_user_id, actor_user_id, actor_name, actor_role, event_type, event_key, status)
      values ('pet-rls-fixture', current_setting('pethub.test_owner'), current_setting('app.user_id'), 'Attacker', 'co_tutor', 'meal', 'cross-owner-meal', 'served');
    raise exception 'cross-owner care accepted';
  exception when insufficient_privilege then null; end;
end $$;
set local role pethub_card_reader;
select set_config('app.sitter_pass_hash', repeat('a',64), true);
do $$ begin
  assert (select count(token_hash) = 1 from pethub.pet_sitter_passes), 'reader has required column grants';
  insert into pethub.shared_care_events(pet_id, owner_user_id, actor_name, actor_role, event_type, event_key, status)
    values ('pet-rls-fixture', current_setting('pethub.test_owner'), 'Cuidador', 'cuidador', 'meal', 'meal:feed:2026-10-28', 'served')
    on conflict (owner_user_id, pet_id, event_key) do nothing;
  begin
    insert into pethub.shared_care_events(pet_id, owner_user_id, actor_name, actor_role, event_type, event_key, status)
      values ('pet-rls-fixture', current_setting('pethub.test_collaborator'), 'Cuidador', 'cuidador', 'meal', 'wrong-owner', 'served');
    raise exception 'sitter could write another owner namespace';
  exception when insufficient_privilege then null; end;
end $$;
set local role pethub_app;
select set_config('app.user_id', current_setting('pethub.test_owner'), true);
do $$ begin
  update pethub.pet_sitter_passes set pin_hash = repeat('b',64) where token_hash = repeat('a',64);
end $$;
set local role pethub_card_reader;
do $$ declare affected integer; i integer; begin
  assert (select count(*) = 0 from pethub.shared_care_events), 'PIN gate applies to shared reads';
  begin
    insert into pethub.shared_care_events(pet_id, owner_user_id, actor_name, actor_role, event_type, event_key, status)
      values ('pet-rls-fixture', current_setting('pethub.test_owner'), 'Cuidador', 'cuidador', 'meal', 'pin-bypass', 'served');
    raise exception 'sitter wrote care without a verified PIN';
  exception when insufficient_privilege then null; end;
  for i in 1..10 loop
    update pethub.pet_sitter_passes set pin_attempt_count = pin_attempt_count + 1
      where token_hash = repeat('a',64) and pin_attempt_count < 5;
    get diagnostics affected = row_count;
    assert affected = case when i <= 5 then 1 else 0 end, 'at most five attempts are reserved';
  end loop;
  assert (select pin_attempt_count = 5 from pethub.pet_sitter_passes), 'budget persists in Postgres';
end $$;
select set_config('app.sitter_verified_pin_hash', repeat('b',64), true);
do $$ begin
  insert into pethub.shared_care_events(pet_id, owner_user_id, actor_name, actor_role, event_type, event_key, status)
    values ('pet-rls-fixture', current_setting('pethub.test_owner'), 'Cuidador', 'cuidador', 'meal', 'verified-pin-meal', 'served');
end $$;
set local role pethub_app;
select set_config('app.user_id', current_setting('pethub.test_owner'), true);
do $$ begin
  update pethub.pet_sitter_passes set revoked_at = now() where token_hash = repeat('a',64);
end $$;
set local role pethub_card_reader;
do $$ begin
  assert (select count(token_hash) = 0 from pethub.pet_sitter_passes), 'revoked passes are hidden';
  assert (select count(*) = 0 from pethub.shared_care_events), 'revocation also removes care access';
  begin
    insert into pethub.shared_care_events(pet_id, owner_user_id, actor_name, actor_role, event_type, event_key, status)
      values ('pet-rls-fixture', current_setting('pethub.test_owner'), 'Cuidador', 'cuidador', 'meal', 'revoked-meal', 'served');
    raise exception 'revoked sitter could write care';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
