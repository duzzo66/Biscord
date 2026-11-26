-- SQL / performance-indexes.sql / PostgreSQL / foreign-key and voice signaling access paths
begin;
create index if not exists sessions_presence_idx on biscord.sessions(user_id,last_seen,expires);
create index if not exists dm_history_idx on biscord.direct_messages(sender,receiver,created desc,id desc);
create index if not exists dm_receiver_idx on biscord.direct_messages(receiver,created desc,id desc);
create index if not exists friendships_receiver_idx on biscord.friendships(receiver,state);
create index if not exists blocks_target_idx on biscord.blocks(target,owner);
create index if not exists server_message_history_idx on biscord.server_messages(server_id,channel_id,created desc,id desc);
create index if not exists membership_user_idx on biscord.server_members(user_id,server_id);
create index if not exists recovery_user_idx on biscord.recovery(user_id);
create index if not exists reset_tokens_user_idx on biscord.reset_tokens(user_id);
create index if not exists server_invites_server_idx on biscord.server_invites(server_id);
create index if not exists server_messages_author_idx on biscord.server_messages(author);
create index if not exists shared_servers_owner_idx on biscord.shared_servers(owner);
create index if not exists voice_signals_receiver_idx on biscord.voice_signals(receiver,server_id,channel_id,created);
create index if not exists voice_signals_sender_idx on biscord.voice_signals(sender);
create index if not exists voice_signals_created_idx on biscord.voice_signals(created);
create index if not exists voice_members_room_idx on biscord.voice_members(server_id,channel_id,updated);
create index if not exists cloud_calls_a_idx on biscord.cloud_calls(a);
create index if not exists cloud_calls_b_idx on biscord.cloud_calls(b);
create index if not exists cloud_calls_updated_idx on biscord.cloud_calls(updated);
create index if not exists cloud_events_created_idx on biscord.cloud_events(created);
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='biscord.recovery'::regclass and contype='p') then
  alter table biscord.recovery add constraint recovery_pkey primary key(code_hash);
  alter table biscord.recovery drop constraint if exists recovery_code_hash_key;
 end if;
end $$;
commit;
