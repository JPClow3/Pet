begin;
set local plpgsql.check_asserts=on;
select set_config('pethub.test_a',gen_random_uuid()::text,true);
select set_config('pethub.test_b',gen_random_uuid()::text,true);
select set_config('pethub.test_device',gen_random_uuid()::text,true);
select set_config('pethub.test_endpoint','https://fcm.googleapis.com/fcm/send/fixture-'||current_setting('pethub.test_device'),true);
set local role pethub_app;
select set_config('app.user_id',current_setting('pethub.test_a'),true);

do $$ declare device pethub.push_devices; agenda jsonb; subscription jsonb; rejected_constraint text; begin
  assert not pg_has_role(current_user,'pethub_push_dispatcher','MEMBER'), 'application role cannot dispatch';
  subscription:=jsonb_build_object('endpoint',current_setting('pethub.test_endpoint'),'keys',jsonb_build_object('p256dh','synthetic-key','auth','synthetic-auth'));
  agenda:=jsonb_build_object('validUntil',now()+interval '7 days','occurrences',jsonb_build_array(jsonb_build_object('key','fixture-occurrence','kind','routine','dueAt',now()+interval '5 minutes','expiresAt',now()+interval '35 minutes','suppressed',false)));
  select * into device from pethub.publish_push_agenda(current_setting('pethub.test_device')::uuid,0,subscription,'{}',agenda);
  assert device.revision=1,'initial publication';
  assert (select count(*)=1 from pethub.push_jobs),'one owner job';
  begin
    set constraints pethub.push_devices_auth_owner immediate;
    raise exception 'push device without managed identity accepted';
  exception when foreign_key_violation then
    get stacked diagnostics rejected_constraint=constraint_name;
    assert rejected_constraint='push_devices_auth_owner','correct ownership constraint rejects missing identity';
  end;
  select * into device from pethub.publish_push_agenda(current_setting('pethub.test_device')::uuid,1,subscription,'{}',agenda);
  assert device.revision=2,'CAS increments';
  assert (select count(*)=0 from pethub.publish_push_agenda(current_setting('pethub.test_device')::uuid,1,subscription,'{}',agenda)),'stale revision rejected';
  assert (select count(*)=1 from pethub.push_jobs),'republish does not duplicate';
  begin
    perform pethub.claim_push_jobs(1);
    raise exception 'application role can claim jobs';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('app.user_id',current_setting('pethub.test_b'),true);

do $$ declare affected integer; begin
  assert (select count(*)=0 from pethub.push_devices),'other devices hidden';
  assert (select count(*)=0 from pethub.push_jobs),'other jobs hidden';
  assert not pethub.revoke_push_device(current_setting('pethub.test_device')::uuid),'other owner cannot revoke';
  update pethub.push_devices set subscription='{}' where installation_id=current_setting('pethub.test_device')::uuid;
  get diagnostics affected=row_count;
  assert affected=0,'other owner cannot change subscription';
  begin
    insert into pethub.push_jobs(installation_id,user_id,occurrence_key,kind,due_at,expires_at,status,next_attempt_at)
      values(current_setting('pethub.test_device')::uuid,current_setting('app.user_id'),'cross-owner','routine',now(),now()+interval '1 hour','pending',now());
    raise exception 'cross-owner job insert accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('app.user_id',current_setting('pethub.test_a'),true);

do $$ begin
  assert pethub.revoke_push_device(current_setting('pethub.test_device')::uuid),'owner revocation succeeds';
  assert (select status='revoked' and subscription='{}'::jsonb and endpoint is null from pethub.push_devices),'revocation clears endpoint and keys';
  assert (select status='cancelled' and lease_id is null from pethub.push_jobs),'revocation cancels queued work';
end $$;
select set_config('app.user_id',current_setting('pethub.test_b'),true);

do $$ declare device pethub.push_devices; begin
  select * into device from pethub.publish_push_agenda(gen_random_uuid(),0,
    jsonb_build_object('endpoint',current_setting('pethub.test_endpoint')),'{}',
    jsonb_build_object('validUntil',now()+interval '7 days','occurrences','[]'::jsonb));
  assert device.installation_id is not null,'revoked endpoint can be registered by another owner';
  perform pethub.revoke_push_device(device.installation_id);
end $$;
select set_config('app.user_id','',true);

do $$ begin
  assert (select count(*)=0 from pethub.push_devices),'missing owner cannot read subscriptions';
  assert (select count(*)=0 from pethub.push_jobs),'missing owner cannot read jobs';
end $$;
rollback;
