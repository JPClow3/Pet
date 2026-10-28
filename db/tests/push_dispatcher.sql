begin;
set local plpgsql.check_asserts=on;
set local role pethub_push_dispatcher;

do $$ declare auth_table oid; begin
  select c.oid into auth_table from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='neon_auth' and c.relname='user';
  assert not pg_has_role(current_user,'pethub_app','MEMBER'),'dispatcher cannot assume application role';
  assert not has_table_privilege(current_user,'pethub.user_snapshots','SELECT'),'dispatcher cannot read backups';
  assert not has_table_privilege(current_user,'pethub.public_cards','SELECT'),'dispatcher cannot read published cards';
  assert not has_table_privilege(current_user,auth_table,'SELECT'),'dispatcher cannot read managed identities';
  assert has_table_privilege(current_user,'pethub.push_devices','SELECT'),'dispatcher can read push subscriptions';
  assert not has_column_privilege(current_user,'pethub.push_devices','subscription','UPDATE'),'dispatcher cannot replace subscription';
  assert not has_column_privilege(current_user,'pethub.push_devices','user_id','UPDATE'),'dispatcher cannot change ownership';
  assert not has_table_privilege(current_user,'pethub.push_devices','INSERT'),'dispatcher cannot register devices';
  assert not has_table_privilege(current_user,'pethub.push_devices','DELETE'),'dispatcher cannot delete devices';
  assert not has_table_privilege(current_user,'pethub.push_jobs','INSERT'),'dispatcher cannot add jobs';
  assert has_function_privilege(current_user,'pethub.claim_push_jobs(integer)','EXECUTE'),'dispatcher can invoke claims';
  assert not has_function_privilege(current_user,'pethub.publish_push_agenda(uuid,integer,jsonb,jsonb,jsonb)','EXECUTE'),'dispatcher cannot publish agendas';
  assert not pethub.push_claim_valid(gen_random_uuid(),gen_random_uuid()),'nonexistent lease cannot send';
  assert not pethub.finish_push_job(gen_random_uuid(),gen_random_uuid(),'accepted',201,null),'nonexistent lease cannot be completed';
  -- Actual claim/retry/revocation behavior is exercised by the isolated development
  -- integration fixture. This production-safe probe never claims existing jobs.
end $$;
rollback;
