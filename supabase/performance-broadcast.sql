-- SQL / performance-broadcast.sql / Supabase PostgreSQL / private broadcasts scoped to active legacy sessions
begin;
grant usage on schema realtime to biscord_realtime;
grant select on realtime.messages to biscord_realtime;
grant execute on function realtime.topic() to biscord_realtime;
drop policy if exists biscord_session_broadcast_read on realtime.messages;
create policy biscord_session_broadcast_read on realtime.messages for select to biscord_realtime using (
 extension='broadcast'
 and (select realtime.topic()) = 'biscord:' || (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'biscord_user_id') || ':' || (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'biscord_session_id')
 and biscord.realtime_session_allowed(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'biscord_user_id')
);
-- The publisher rechecks sessions for every event, because channel RLS is cached after joining.
-- Revoked/expired/disabled sessions receive no new broadcasts even with an open socket.
create or replace function biscord.broadcast_cloud_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient record; event jsonb;
begin
 if octet_length(new.payload)>120000 then
  event=jsonb_build_object('id',new.id,'type',new.type,'fetch',true);
 else
  event=jsonb_build_object('id',new.id,'type',new.type,'payload',new.payload);
 end if;
 for recipient in
  select s.id from biscord.sessions s join biscord.users u on u.id=s.user_id
  where s.user_id=new.user_id and u.disabled=0
   and s.expires>extract(epoch from now())*1000
   and s.last_seen>(extract(epoch from now())*1000)-120000
 loop
  perform realtime.send(event,'event','biscord:'||new.user_id||':'||recipient.id,true);
 end loop;
 return new;
end;
$$;
revoke all on function biscord.broadcast_cloud_event() from public,anon,authenticated,biscord_realtime;
drop trigger if exists biscord_cloud_event_broadcast on biscord.cloud_events;
create trigger biscord_cloud_event_broadcast after insert on biscord.cloud_events
for each row execute function biscord.broadcast_cloud_event();
commit;
