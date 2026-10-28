-- Run with a test role able to SET ROLE pethub_app and pethub_push_dispatcher.
-- Synthetic principals remain inside this rolled-back transaction; never create auth users.
begin;
set local plpgsql.check_asserts=on;
select set_config('pethub.test_a',gen_random_uuid()::text,true);
select set_config('pethub.test_b',gen_random_uuid()::text,true);
select set_config('pethub.test_device',gen_random_uuid()::text,true);
select set_config('pethub.test_endpoint','https://fcm.googleapis.com/fcm/send/'||current_setting('pethub.test_device'),true);
set local role pethub_app;
select set_config('app.user_id',current_setting('pethub.test_a'),true);
do $$ declare device pethub.push_devices; agenda jsonb; subscription jsonb; rejected_constraint text; begin
 subscription:=jsonb_build_object('endpoint',current_setting('pethub.test_endpoint'),'keys','{"p256dh":"fixture","auth":"fixture"}'::jsonb);
 agenda:=jsonb_build_object('validUntil',now()+interval '7 days','occurrences',jsonb_build_array(jsonb_build_object('key','fixture-occurrence','kind','routine','dueAt',now()-interval '1 minute','expiresAt',now()+interval '30 minutes','suppressed',false)));
 select * into device from pethub.publish_push_agenda(current_setting('pethub.test_device')::uuid,0,subscription,'{}',agenda);
 assert device.revision=1,'initial publication';
 assert (select count(*)=1 from pethub.push_jobs),'one job';
 begin
   set constraints pethub.push_devices_auth_owner immediate;
   raise exception 'missing auth owner accepted';
 exception when foreign_key_violation then
   get stacked diagnostics rejected_constraint=constraint_name;
   assert rejected_constraint='push_devices_auth_owner','expected auth FK rejects synthetic principal';
 end;
 assert (select count(*)=0 from pethub.publish_push_agenda(current_setting('pethub.test_device')::uuid,0,subscription,'{}',agenda)),'stale initial publication rejected';
 select * into device from pethub.publish_push_agenda(current_setting('pethub.test_device')::uuid,1,subscription,'{}',agenda);
 assert device.revision=2,'CAS increments';
 assert (select count(*)=1 from pethub.push_jobs),'republish does not duplicate';
 assert (select due_at<now() and status='pending' from pethub.push_jobs),'recent due occurrence survives republish before dispatcher claims it';
end $$;
select set_config('app.user_id',current_setting('pethub.test_b'),true);
do $$ begin
 assert (select count(*)=0 from pethub.push_devices),'other device hidden';
 assert (select count(*)=0 from pethub.push_jobs),'other jobs hidden';
 assert not pethub.revoke_push_device(current_setting('pethub.test_device')::uuid),'other account cannot revoke';
end $$;
set local role pethub_push_dispatcher;
do $$ declare job record; recovered record; begin
 assert not has_table_privilege(current_user,'pethub.user_snapshots','SELECT'),'dispatcher cannot read snapshots';
 assert not has_column_privilege(current_user,'pethub.push_devices','subscription','UPDATE'),'dispatcher cannot replace endpoints';
 select * into job from pethub.claim_push_jobs(20);
 assert job.job_id is not null,'due job claimed';
 assert (select count(*)=0 from pethub.claim_push_jobs(20)),'active lease prevents second claim';
 assert pethub.push_claim_valid(job.job_id,job.lease_id),'claim valid';
 update pethub.push_jobs set lease_until=now()-interval '1 second' where id=job.job_id;
 select * into recovered from pethub.claim_push_jobs(20);
 assert recovered.job_id=job.job_id and recovered.lease_id<>job.lease_id,'expired lease gets a new identity';
 assert recovered.attempts=job.attempts+1,'expired lease retains prior attempts';
 assert not pethub.push_claim_valid(job.job_id,job.lease_id),'expired lease cannot send';
 perform set_config('pethub.test_job',recovered.job_id::text,true);
 perform set_config('pethub.test_lease',recovered.lease_id::text,true);
end $$;
set local role pethub_app;
select set_config('app.user_id',current_setting('pethub.test_a'),true);
do $$ declare agenda jsonb; begin
 agenda:=jsonb_build_object('validUntil',now()+interval '7 days','occurrences',jsonb_build_array(jsonb_build_object('key','fixture-occurrence','kind','routine','dueAt',now()+interval '5 minutes','expiresAt',now()+interval '30 minutes','suppressed',false)));
 perform pethub.publish_push_agenda(current_setting('pethub.test_device')::uuid,2,jsonb_build_object('endpoint',current_setting('pethub.test_endpoint')),'{}',agenda);
 assert (select lease_id is null and status='pending' from pethub.push_jobs),'publication invalidates lease';
end $$;
set local role pethub_push_dispatcher;
do $$ begin
 assert not pethub.push_claim_valid(current_setting('pethub.test_job')::uuid,current_setting('pethub.test_lease')::uuid),'old dispatcher cannot send changed agenda';
 assert (select count(*)=0 from pethub.claim_push_jobs(20)),'rescheduled future job cannot be claimed';
end $$;
set local role pethub_app;
select set_config('app.user_id',current_setting('pethub.test_a'),true);
do $$ declare agenda jsonb; begin
 agenda:=jsonb_build_object('validUntil',now()+interval '7 days','occurrences',jsonb_build_array(jsonb_build_object('key','fixture-occurrence','kind','routine','dueAt',now()-interval '1 minute','expiresAt',now()+interval '30 minutes','suppressed',false)));
 perform pethub.publish_push_agenda(current_setting('pethub.test_device')::uuid,3,jsonb_build_object('endpoint',current_setting('pethub.test_endpoint')),'{}',agenda);
 -- Repeating the same due occurrence can shorten but never prolong its existing delivery window.
 agenda:=jsonb_set(agenda,'{occurrences,0,expiresAt}',to_jsonb(now()+interval '45 minutes'));
 perform pethub.publish_push_agenda(current_setting('pethub.test_device')::uuid,4,jsonb_build_object('endpoint',current_setting('pethub.test_endpoint')),'{}',agenda);
 assert (select status='pending' and expires_at=now()+interval '30 minutes' from pethub.push_jobs),'republish keeps original expiry';
end $$;
set local role pethub_push_dispatcher;
do $$ declare job record; begin
 select * into job from pethub.claim_push_jobs(20);
 assert pethub.finish_push_job(job.job_id,job.lease_id,'retry',429,now()+interval '10 minutes'),'provider backoff recorded';
 perform set_config('pethub.test_attempts',job.attempts::text,true);
end $$;
set local role pethub_app;
select set_config('app.user_id',current_setting('pethub.test_a'),true);
do $$ declare agenda jsonb; begin
 agenda:=jsonb_build_object('validUntil',now()+interval '7 days','occurrences',jsonb_build_array(jsonb_build_object('key','fixture-occurrence','kind','routine','dueAt',now()-interval '1 minute','expiresAt',now()+interval '45 minutes','suppressed',false)));
 perform pethub.publish_push_agenda(current_setting('pethub.test_device')::uuid,5,jsonb_build_object('endpoint',current_setting('pethub.test_endpoint')),'{}',agenda);
 assert (select status='retry' and next_attempt_at=now()+interval '10 minutes' and attempts=current_setting('pethub.test_attempts')::integer from pethub.push_jobs),'unchanged publication preserves retry backoff and attempts';
end $$;
set local role pethub_push_dispatcher;
do $$ declare job record; begin
 assert (select count(*)=0 from pethub.claim_push_jobs(20)),'republish cannot bypass provider backoff';
 -- Simulate elapsed backoff without waiting or sending a notification.
 update pethub.push_jobs set next_attempt_at=now() where id=current_setting('pethub.test_job')::uuid;
 select * into job from pethub.claim_push_jobs(20);
 assert pethub.finish_push_job(job.job_id,job.lease_id,'accepted',201,null),'accepted recorded';
 assert not pethub.finish_push_job(job.job_id,job.lease_id,'retry',503,now()),'old lease cannot overwrite accepted';
end $$;
set local role pethub_app;
select set_config('app.user_id',current_setting('pethub.test_a'),true);
do $$ declare agenda jsonb; begin
 agenda:=jsonb_build_object('validUntil',now()+interval '7 days','occurrences',jsonb_build_array(jsonb_build_object('key','fixture-occurrence','kind','routine','dueAt',now(),'expiresAt',now()+interval '30 minutes','suppressed',false)));
 perform pethub.publish_push_agenda(current_setting('pethub.test_device')::uuid,6,jsonb_build_object('endpoint',current_setting('pethub.test_endpoint')),'{}',agenda);
 assert (select status='accepted' from pethub.push_jobs),'accepted occurrence survives republish';
 assert pethub.revoke_push_device(current_setting('pethub.test_device')::uuid),'owner can revoke';
 assert (select status='revoked' from pethub.push_devices),'device revoked';
 assert (select subscription='{}'::jsonb and endpoint is null from pethub.push_devices),'revocation removes endpoint keys';
end $$;
select set_config('app.user_id',current_setting('pethub.test_b'),true);
do $$ declare device pethub.push_devices; begin
 select * into device from pethub.publish_push_agenda(gen_random_uuid(),0,
   jsonb_build_object('endpoint',current_setting('pethub.test_endpoint')),'{}',
   jsonb_build_object('validUntil',now()+interval '7 days','occurrences','[]'::jsonb));
 assert device.installation_id is not null,'revoked endpoint can be registered by a new account';
 perform pethub.revoke_push_device(device.installation_id);
end $$;
do $$ declare index integer; device_id uuid; agenda jsonb; begin
 agenda:=jsonb_build_object('validUntil',now()+interval '7 days','occurrences','[]'::jsonb);
 for index in 1..10 loop
   device_id:=gen_random_uuid();
   perform pethub.publish_push_agenda(device_id,0,jsonb_build_object('endpoint','https://fcm.googleapis.com/fcm/send/'||device_id),'{}',agenda);
 end loop;
 assert (select count(*)=10 from pethub.push_devices where status='active'),'ten active devices permitted';
 assert (select count(*)=0 from pethub.publish_push_agenda(gen_random_uuid(),0,jsonb_build_object('endpoint',current_setting('pethub.test_endpoint')||'-eleventh'),'{}',agenda)),'device cap enforced by publication transaction';
 for device_id in select installation_id from pethub.push_devices where status='active' loop perform pethub.revoke_push_device(device_id); end loop;
end $$;
set local role pethub_push_dispatcher;
do $$ begin assert (select count(*)=0 from pethub.claim_push_jobs(20)),'revoked device cannot send'; end $$;
rollback;
