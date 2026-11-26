// JavaScript / client/realtime-source.js / esbuild + supabase-js / one authenticated event subscription
import {createClient} from '@supabase/supabase-js';
export async function connectRealtime(api,initial,dispatch){
 let config=initial,stopped=false,renewing=null,cursor=api.eventCursor||0,replaying=null,connected=false;
 const seen=new Set(),inflight=new Map(),deferred=new Set();let channel;
 const watermark=()=>deferred.size?Math.min(cursor,...[...deferred].map(id=>Number(id)-1)):cursor;
 async function token(){
  if(stopped)return null;
  if(config.expiresAt-Date.now()<60000){
   renewing||=api.request('/realtime').then(next=>{if(!next.enabled)throw Error('Realtime disabled');config=next;return next;}).finally(()=>renewing=null);
   try{await renewing;}catch(error){if(error.status===401){dispose();dispatch('revoked',{});}throw error;}
  }
  return config.token;
 }
 const client=createClient(config.url,config.anonKey,{accessToken:token,auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 await client.realtime.setAuth(config.token);
 function receive(row){
  if(stopped)return;
  if(row.fetch){const id=String(row.id);if(seen.has(id)||inflight.has(id))return;deferred.add(id);api.eventCursor=watermark();const task=api.request('/events/item?id='+encodeURIComponent(id)).then(result=>receive(result.event)).catch(error=>api.onStatus?.('offline',error.message)).finally(()=>inflight.delete(id));inflight.set(id,task);return;}
  const id=String(row.id);if(seen.has(id))return;seen.add(id);if(seen.size>2000)seen.delete(seen.values().next().value);
  deferred.delete(id);cursor=Math.max(cursor,Number(row.id));api.eventCursor=watermark();
  dispatch(row.type,typeof row.payload==='string'?JSON.parse(row.payload):row.payload);
 }
 async function replay(){
  if(replaying)return replaying;
  replaying=(async()=>{let after=watermark();while(!stopped){const result=await api.request('/events/replay?after='+after);for(const row of result.events)receive(row);if(!result.hasMore)break;if(result.next<=after)throw Error('Invalid replay cursor');after=result.next;}})().finally(()=>replaying=null);return replaying;
 }
 const topic='biscord:'+config.userId+':'+config.sessionId;
 const broadcast=config.transport==='broadcast';
 channel=client.channel(topic,{config:broadcast?{private:true}:{postgres_changes_options:{wait:true,timeout:15000}}});
 if(broadcast)channel.on('broadcast',{event:'event'},payload=>receive(payload.payload));
 else channel.on('postgres_changes',{event:'INSERT',schema:'biscord',table:'cloud_events',filter:'user_id=eq.'+config.userId},payload=>receive(payload.new));
 channel.subscribe(async status=>{
   if(stopped)return;
   if(status==='SUBSCRIBED'){
    try{await replay();if(connected){await api.refresh();api.onChange?.(api.session,api.workspace);const key=api.activeConversation;if(key)await api.loadHistory(key,{force:true});}connected=true;api.onStatus?.('saved');}
    catch(error){api.onStatus?.('offline',error.message);}
   }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')api.onStatus?.('offline','Reconectando mensagens...');
  });
 function dispose(){if(stopped)return;stopped=true;api.eventCursor=watermark();if(channel)client.removeChannel(channel).catch(()=>{});client.realtime.disconnect();}
 return {dispose,catchUp:replay,get channelCount(){return client.getChannels().length;}};
}
