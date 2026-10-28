begin;
set local plpgsql.check_asserts = on;
select set_config('pethub.test_a', gen_random_uuid()::text, true);
select set_config('pethub.test_b', gen_random_uuid()::text, true);
set local role pethub_app;
select set_config('app.user_id', current_setting('pethub.test_a'), true);
do $$ declare revision_result integer; affected integer; rejected_constraint text; begin
  insert into pethub.user_snapshots(user_id,snapshot) values(current_setting('app.user_id'), '{"format":"pethub-backup","version":1}') returning revision into revision_result;
  assert revision_result = 1, 'initial revision';
  begin
    set constraints pethub.snapshots_auth_owner immediate;
    raise exception 'snapshot without managed identity accepted';
  exception when foreign_key_violation then
    get stacked diagnostics rejected_constraint = constraint_name;
    assert rejected_constraint = 'snapshots_auth_owner', 'correct owner constraint rejects missing identity';
  end;
  assert (select owner_auth_id=current_setting('app.user_id')::uuid from pethub.user_snapshots), 'generated owner preserves identity';
  assert (select snapshot->>'version'='1' from pethub.user_snapshots where user_id=current_setting('app.user_id')), 'legacy v1 accepted';
  update pethub.user_snapshots set snapshot = '{"format":"pethub-backup","version":1,"marker":"second"}' where user_id=current_setting('app.user_id') and revision=1 returning revision into revision_result;
  assert revision_result = 2, 'CAS increment';
  update pethub.user_snapshots set snapshot = '{"format":"pethub-backup","version":1,"marker":"stale"}' where user_id=current_setting('app.user_id') and revision=1;
  get diagnostics affected = row_count;
  assert affected = 0, 'stale write rejected';
  begin
    update pethub.user_snapshots set snapshot = '{}' where user_id=current_setting('app.user_id');
    raise exception 'invalid format accepted';
  exception when check_violation then null; end;
end $$;
do $$ declare fixture jsonb; revision_before integer; begin
  -- Synthetic PDF signature only; no real pet, medical, or account data.
  fixture := jsonb_build_object(
    'format','pethub-backup','version',2,
    'documents',jsonb_build_array(jsonb_build_object(
      'id','document-fixture','petId','pet-fixture','title','Synthetic file',
      'category','outro','date',null,'notes',null,'fileName','fixture.pdf',
      'mimeType','application/pdf','sizeBytes',9,
      'mediaId','e5c62df5dab5c87b6a015ef3d43597074d1eec433b15f51aec63b8582d0e4ab4.application_pdf',
      'createdAt','2026-10-25T12:00:00Z','updatedAt','2026-10-25T12:00:00Z','deletedAt',null)),
    'files',jsonb_build_object(
      'e5c62df5dab5c87b6a015ef3d43597074d1eec433b15f51aec63b8582d0e4ab4.application_pdf',
      'data:application/pdf;base64,JVBERi0xLjQK'));
  update pethub.user_snapshots set snapshot=fixture where user_id=current_setting('app.user_id') returning revision into revision_before;
  assert (select snapshot=fixture from pethub.user_snapshots where user_id=current_setting('app.user_id')), 'v2 documents and embedded files accepted intact';
  begin
    update pethub.user_snapshots set snapshot=jsonb_set(fixture,'{version}','3'::jsonb) where user_id=current_setting('app.user_id');
    raise exception 'unsupported v3 accepted';
  exception when check_violation then null; end;
  begin
    update pethub.user_snapshots set snapshot=jsonb_build_object('format','pethub-backup','version',2,'files',jsonb_build_object('oversized',repeat('x',20971520))) where user_id=current_setting('app.user_id');
    raise exception 'snapshot over 20 MiB accepted';
  exception when check_violation then null; end;
  assert (select snapshot=fixture and revision=revision_before from pethub.user_snapshots where user_id=current_setting('app.user_id')), 'failed format and size changes preserve prior snapshot';
end $$;
do $$ declare old_generation uuid; new_generation uuid; affected integer; begin
  select generation into old_generation from pethub.user_snapshots where user_id=current_setting('app.user_id');
  delete from pethub.user_snapshots where user_id=current_setting('app.user_id');
  insert into pethub.user_snapshots(user_id,snapshot) values(current_setting('app.user_id'), '{"format":"pethub-backup","version":1}') returning generation into new_generation;
  assert old_generation <> new_generation, 'recreated snapshot gets a new identity';
  update pethub.user_snapshots set snapshot = '{"format":"pethub-backup","version":1,"marker":"stale-generation"}' where user_id=current_setting('app.user_id') and revision=1 and generation=old_generation;
  get diagnostics affected = row_count; assert affected = 0, 'stale generation update denied';
  delete from pethub.user_snapshots where user_id=current_setting('app.user_id') and revision=1 and generation=old_generation;
  get diagnostics affected = row_count; assert affected = 0, 'stale generation delete denied';
  update pethub.user_snapshots set snapshot = '{"format":"pethub-backup","version":1,"marker":"current-generation"}' where user_id=current_setting('app.user_id') and revision=1 and generation=new_generation;
  get diagnostics affected = row_count; assert affected = 1, 'current generation update succeeds';
end $$;
select set_config('app.user_id', current_setting('pethub.test_b'), true);
do $$ declare affected integer; begin
  assert (select count(*)=0 from pethub.user_snapshots), 'other users hidden';
  update pethub.user_snapshots set snapshot = '{"format":"pethub-backup","version":1}' where user_id=current_setting('pethub.test_a');
  get diagnostics affected = row_count; assert affected = 0, 'cross-user update denied';
  delete from pethub.user_snapshots where user_id=current_setting('pethub.test_a');
  get diagnostics affected = row_count; assert affected = 0, 'cross-user delete denied';
  begin
    insert into pethub.user_snapshots(user_id,snapshot) values(current_setting('pethub.test_a'), '{"format":"pethub-backup","version":1}');
    raise exception 'cross-user insert accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('app.user_id', '', true);
do $$ begin
  assert (select count(*)=0 from pethub.user_snapshots), 'missing identity denied';
end $$;
rollback;
