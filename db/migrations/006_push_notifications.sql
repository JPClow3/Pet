begin;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'pethub_push_dispatcher') then
    create role pethub_push_dispatcher nologin nobypassrls;
  end if;
  -- The migration owner can run rollback fixtures; runtime logins remain separate.
  execute format('grant pethub_push_dispatcher to %I',current_user);
end $$;
grant usage on schema pethub to pethub_push_dispatcher;

create table pethub.push_devices (
  installation_id uuid primary key,
  user_id text not null,
  owner_auth_id uuid generated always as (user_id::uuid) stored constraint push_devices_auth_owner references neon_auth."user"(id) on delete cascade deferrable initially deferred,
  subscription jsonb not null check (jsonb_typeof(subscription) = 'object'),
  endpoint text generated always as (subscription ->> 'endpoint') stored,
  preferences jsonb not null check (jsonb_typeof(preferences) = 'object'),
  revision integer not null default 1 check (revision > 0),
  status text not null default 'active' check (status in ('active','revoked','expired')),
  published_at timestamptz not null default now(),
  valid_until timestamptz not null,
  last_code integer,
  created_at timestamptz not null default now(),
  check (octet_length(subscription::text) <= 8192),
  check (octet_length(preferences::text) <= 2048)
);
create unique index push_devices_active_endpoint on pethub.push_devices(endpoint) where status='active';
create index push_devices_owner on pethub.push_devices(owner_auth_id);
create table pethub.push_jobs (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null references pethub.push_devices(installation_id) on delete cascade,
  user_id text not null,
  occurrence_key text not null check (length(occurrence_key) between 1 and 240),
  kind text not null check (kind in ('prevention','routine')),
  due_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null check (status in ('pending','leased','accepted','retry','suppressed','cancelled','expired','failed')),
  lease_id uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null,
  last_code integer,
  accepted_at timestamptz,
  unique(installation_id, occurrence_key),
  check (expires_at > due_at)
);
create index push_jobs_due on pethub.push_jobs(next_attempt_at) where status in ('pending','retry','leased');
alter table pethub.push_devices enable row level security;
alter table pethub.push_devices force row level security;
alter table pethub.push_jobs enable row level security;
alter table pethub.push_jobs force row level security;
revoke all on pethub.push_devices, pethub.push_jobs from public;
grant select, insert, update, delete on pethub.push_devices, pethub.push_jobs to pethub_app;
create policy own_push_devices on pethub.push_devices to pethub_app
 using(user_id = nullif(current_setting('app.user_id',true),''))
 with check(user_id = nullif(current_setting('app.user_id',true),''));
create policy own_push_jobs on pethub.push_jobs to pethub_app
 using(user_id = nullif(current_setting('app.user_id',true),''))
 with check(user_id = nullif(current_setting('app.user_id',true),'') and exists(select 1 from pethub.push_devices d where d.installation_id = push_jobs.installation_id and d.user_id = push_jobs.user_id));
grant select on pethub.push_devices, pethub.push_jobs to pethub_push_dispatcher;
grant update(status,last_code) on pethub.push_devices to pethub_push_dispatcher;
grant update(status,lease_id,lease_until,attempts,next_attempt_at,last_code,accepted_at) on pethub.push_jobs to pethub_push_dispatcher;
create policy dispatch_push_devices on pethub.push_devices to pethub_push_dispatcher using(true) with check(true);
create policy dispatch_push_jobs on pethub.push_jobs to pethub_push_dispatcher using(true) with check(true);

create function pethub.publish_push_agenda(p_id uuid,p_revision integer,p_subscription jsonb,p_preferences jsonb,p_agenda jsonb)
returns setof pethub.push_devices language plpgsql security invoker set search_path = '' as $$
declare device pethub.push_devices; principal text := nullif(current_setting('app.user_id',true),'');
begin
  if principal is null then raise exception 'Owner required'; end if;
  -- Serialize the per-account device limit, including concurrent registrations/reactivations.
  perform pg_advisory_xact_lock(hashtextextended('pethub:push:'||principal,0));
  if (select count(*) from pethub.push_devices where user_id=principal and status='active' and installation_id<>p_id)>=10 then return; end if;
  if p_revision = 0 then
    insert into pethub.push_devices(installation_id,user_id,subscription,preferences,valid_until)
      values(p_id,principal,p_subscription,p_preferences,(p_agenda->>'validUntil')::timestamptz)
      on conflict do nothing returning * into device;
  else
    update pethub.push_devices set subscription=p_subscription,preferences=p_preferences,
      valid_until=(p_agenda->>'validUntil')::timestamptz,published_at=now(),revision=revision+1,status='active',last_code=null
      where installation_id=p_id and user_id=principal and revision=p_revision returning * into device;
  end if;
  if device.installation_id is null then return; end if;
  -- Any publication invalidates an outstanding lease, including the same key
  -- moved to another time or newly suppressed by changed preferences.
  update pethub.push_jobs set status='cancelled',lease_id=null,lease_until=null
    where installation_id=p_id and status='leased';
  update pethub.push_jobs set status='cancelled',lease_id=null,lease_until=null
    where installation_id=p_id and status in ('pending','retry','leased','suppressed')
      and occurrence_key not in (select value->>'key' from jsonb_array_elements(p_agenda->'occurrences'));
  insert into pethub.push_jobs(installation_id,user_id,occurrence_key,kind,due_at,expires_at,status,next_attempt_at)
    select p_id,principal,value->>'key',value->>'kind',(value->>'dueAt')::timestamptz,(value->>'expiresAt')::timestamptz,
      case when (value->>'suppressed')::boolean then 'suppressed' else 'pending' end,(value->>'dueAt')::timestamptz
    from jsonb_array_elements(p_agenda->'occurrences')
    on conflict(installation_id,occurrence_key) do update set
      due_at=excluded.due_at,
      expires_at=case when push_jobs.due_at=excluded.due_at then least(push_jobs.expires_at,excluded.expires_at) else excluded.expires_at end,
      status=case when excluded.status='suppressed' then 'suppressed'
        when push_jobs.due_at=excluded.due_at and push_jobs.status='retry' then 'retry'
        else 'pending' end,
      -- An unchanged publication must not bypass provider backoff, including
      -- after temporary suppression. Attempts are deliberately retained.
      next_attempt_at=case when push_jobs.due_at=excluded.due_at
        then greatest(push_jobs.next_attempt_at,excluded.next_attempt_at)
        else excluded.next_attempt_at end,
      lease_id=null,lease_until=null
    where push_jobs.status not in ('accepted','failed','expired');
  return next device;
end $$;

create function pethub.revoke_push_device(p_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  update pethub.push_devices set status='revoked',revision=revision+1,subscription='{}'::jsonb where installation_id=p_id and user_id=nullif(current_setting('app.user_id',true),'');
  if not found then return false; end if;
  update pethub.push_jobs set status='cancelled',lease_id=null,lease_until=null where installation_id=p_id and status in ('pending','retry','leased','suppressed');
  return true;
end $$;

create function pethub.claim_push_jobs(p_limit integer default 20)
returns table(job_id uuid,installation_id uuid,lease_id uuid,subscription jsonb,occurrence_key text,expires_at timestamptz,attempts integer)
language plpgsql security invoker set search_path = '' as $$
begin
  update pethub.push_jobs j set status='expired',lease_id=null where j.status in ('pending','retry','leased') and j.expires_at<=now();
  return query
  with selected as (
    select j.id from pethub.push_jobs j join pethub.push_devices d on d.installation_id=j.installation_id
    where d.status='active' and d.valid_until>now() and j.expires_at>now() and j.attempts<5
      and j.next_attempt_at<=now() and (j.status in ('pending','retry') or (j.status='leased' and j.lease_until<now()))
    order by j.next_attempt_at for update of j skip locked limit greatest(1,least(p_limit,25))
  ), claimed as (
    update pethub.push_jobs j set status='leased',lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=j.attempts+1
    from selected s where j.id=s.id returning j.*
  ) select c.id,c.installation_id,c.lease_id,d.subscription,c.occurrence_key,c.expires_at,c.attempts
    from claimed c join pethub.push_devices d on d.installation_id=c.installation_id;
end $$;

create function pethub.push_claim_valid(p_job uuid,p_lease uuid) returns boolean
language sql security invoker set search_path = '' as $$
 select exists(select 1 from pethub.push_jobs j join pethub.push_devices d on d.installation_id=j.installation_id
 where j.id=p_job and j.lease_id=p_lease and j.status='leased' and j.lease_until>now() and j.due_at<=now() and j.expires_at>now() and d.status='active' and d.valid_until>now());
$$;
create function pethub.finish_push_job(p_job uuid,p_lease uuid,p_status text,p_code integer,p_retry timestamptz)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare device_id uuid;
begin
 if p_status not in ('accepted','retry','failed','expired','suppressed') then raise exception 'Invalid outcome'; end if;
 -- Publish/revoke lock device then jobs. Keep that order and recheck the lease
 -- after acquiring the device lock so concurrent cancellation wins safely.
 select installation_id into device_id from pethub.push_jobs where id=p_job;
 if device_id is null then return false; end if;
 perform installation_id from pethub.push_devices where installation_id=device_id for update;
 if not found then return false; end if;
 update pethub.push_jobs set status=p_status,last_code=p_code,next_attempt_at=coalesce(p_retry,next_attempt_at),
   accepted_at=case when p_status='accepted' then now() else accepted_at end,lease_id=null,lease_until=null
   where id=p_job and installation_id=device_id and lease_id=p_lease and status='leased' returning installation_id into device_id;
 if device_id is null then return false; end if;
 update pethub.push_devices set last_code=p_code,status=case when p_code in (404,410) then 'expired' else status end where installation_id=device_id;
 if p_code in (404,410) then update pethub.push_jobs set status='cancelled',lease_id=null where installation_id=device_id and status in ('pending','retry','leased'); end if;
 return true;
end $$;
revoke all on function pethub.publish_push_agenda(uuid,integer,jsonb,jsonb,jsonb),pethub.revoke_push_device(uuid),pethub.claim_push_jobs(integer),pethub.push_claim_valid(uuid,uuid),pethub.finish_push_job(uuid,uuid,text,integer,timestamptz) from public;
grant execute on function pethub.publish_push_agenda(uuid,integer,jsonb,jsonb,jsonb),pethub.revoke_push_device(uuid) to pethub_app;
grant execute on function pethub.claim_push_jobs(integer),pethub.push_claim_valid(uuid,uuid),pethub.finish_push_job(uuid,uuid,text,integer,timestamptz) to pethub_push_dispatcher;
-- Provision a separate login with membership ONLY in pethub_push_dispatcher.
-- Never grant it pethub_app or access to snapshots/auth tables.
commit;
