-- SQL / performance-realtime.sql / Supabase PostgreSQL / isolated legacy-account event authorization
-- Run after importing the existing biscord schema. Does not expose application tables.
begin;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='biscord_realtime') then
  create role biscord_realtime nologin noinherit;
 end if;
end $$;
grant usage on schema biscord to biscord_realtime;
grant select on biscord.cloud_events to biscord_realtime;
create or replace function biscord.realtime_session_allowed(event_user text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from biscord.sessions s join biscord.users u on u.id=s.user_id
  where s.id=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'biscord_session_id')
    and s.id=auth.uid()::text
    and s.user_id=event_user
    and event_user=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'biscord_user_id')
    and s.expires > extract(epoch from now())*1000 and u.disabled=0
 );
$$;
revoke all on function biscord.realtime_session_allowed(text) from public,anon,authenticated;
grant execute on function biscord.realtime_session_allowed(text) to biscord_realtime;
alter table biscord.cloud_events enable row level security;
drop policy if exists biscord_events_current_session on biscord.cloud_events;
create policy biscord_events_current_session on biscord.cloud_events
for select to biscord_realtime using (biscord.realtime_session_allowed(user_id));
do $$ begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
  create publication supabase_realtime;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='biscord' and tablename='cloud_events') then
  alter publication supabase_realtime add table biscord.cloud_events;
 end if;
end $$;
commit;
