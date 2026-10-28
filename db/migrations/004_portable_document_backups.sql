begin;
alter table pethub.user_snapshots drop constraint snapshot_format;
alter table pethub.user_snapshots add constraint snapshot_format check ((
  jsonb_typeof(snapshot) = 'object' and snapshot ->> 'format' = 'pethub-backup'
  and snapshot ->> 'version' in ('1','2') and octet_length(snapshot::text) <= 20971520
) is true);
commit;
