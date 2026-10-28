begin;
set local plpgsql.check_asserts = on;
select set_config('pethub.test_owner',gen_random_uuid()::text,true);
select set_config('pethub.other_owner',gen_random_uuid()::text,true);
select set_config('pethub.old_hash',replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),true);
select set_config('pethub.new_hash',replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),true);
select set_config('app.user_id',current_setting('pethub.test_owner'),true);
set local role pethub_app;
do $$ declare row_id uuid; affected integer; rejected_constraint text; begin
  insert into pethub.public_cards(user_id,pet_id,token_hash,card,expires_at)
  values(current_setting('app.user_id'),'test-pet',current_setting('pethub.old_hash'),'{"v":1,"name":"Luna","species":"gato","breed":null,"city":null,"lost":null,"health":null,"contact":null,"generatedAt":"2026-10-25T12:00:00Z"}',now()+interval '7 days') returning id into row_id;
  begin
    set constraints pethub.cards_auth_owner immediate;
    raise exception 'card without managed identity accepted';
  exception when foreign_key_violation then
    get stacked diagnostics rejected_constraint = constraint_name;
    assert rejected_constraint = 'cards_auth_owner', 'correct owner constraint rejects missing identity';
  end;
  assert (select owner_auth_id=current_setting('app.user_id')::uuid from pethub.public_cards where id=row_id), 'generated owner preserves identity';
  perform set_config('pethub.test_card',row_id::text,true);
  update pethub.public_cards set expires_at=now()+interval '8 days' where id=row_id and revision=1;
  get diagnostics affected=row_count; assert affected=1,'owner update succeeds';
  update pethub.public_cards set expires_at=now()+interval '9 days' where id=row_id and revision=1;
  get diagnostics affected=row_count; assert affected=0,'stale owner update denied';
end $$;
select set_config('app.user_id',current_setting('pethub.other_owner'),true);
do $$ declare affected integer; begin
  assert (select count(*)=0 from pethub.public_cards),'owner isolation';
  update pethub.public_cards set revoked_at=now() where id=current_setting('pethub.test_card')::uuid;
  get diagnostics affected=row_count; assert affected=0,'cross-owner revoke denied';
end $$;
set local role pethub_card_reader;
select set_config('app.public_card_hash',current_setting('pethub.old_hash'),true);
do $$ begin
  assert (select count(card)=1 from pethub.public_cards),'active public payload readable';
  begin
    perform user_id from pethub.public_cards;
    raise exception 'reader exposed owner identity';
  exception when insufficient_privilege then null; end;
  begin
    perform owner_auth_id from pethub.public_cards;
    raise exception 'reader exposed generated owner identity';
  exception when insufficient_privilege then null; end;
  begin
    update pethub.public_cards set revoked_at=now();
    raise exception 'reader can mutate';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('app.public_card_hash','',true);
do $$ begin assert (select count(card)=0 from pethub.public_cards),'missing token hidden'; end $$;
set local role pethub_app;
select set_config('app.user_id',current_setting('pethub.test_owner'),true);
update pethub.public_cards set expires_at=now()-interval '1 minute' where id=current_setting('pethub.test_card')::uuid;
set local role pethub_card_reader;
select set_config('app.public_card_hash',current_setting('pethub.old_hash'),true);
do $$ begin assert (select count(card)=0 from pethub.public_cards),'expired card hidden'; end $$;
set local role pethub_app;
update pethub.public_cards set expires_at=now()+interval '7 days',revoked_at=now(),card=null where id=current_setting('pethub.test_card')::uuid;
set local role pethub_card_reader;
do $$ begin assert (select count(card)=0 from pethub.public_cards),'revoked card hidden'; end $$;
set local role pethub_app;
update pethub.public_cards set token_hash=current_setting('pethub.new_hash'),revoked_at=null,card='{"v":1,"name":"Nova publicação","species":"gato","breed":null,"city":null,"lost":null,"health":null,"contact":null,"generatedAt":"2026-10-25T12:00:00Z"}' where id=current_setting('pethub.test_card')::uuid;
set local role pethub_card_reader;
do $$ begin assert (select count(card)=0 from pethub.public_cards),'old token hidden after rotation'; end $$;
select set_config('app.public_card_hash',current_setting('pethub.new_hash'),true);
do $$ begin assert (select count(card)=1 from pethub.public_cards),'new token readable'; end $$;
rollback;
