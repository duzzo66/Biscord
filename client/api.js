// JavaScript / client/api.js / modern browsers / incremental chat state and a shared realtime transport
(()=>{
 let csrf='',revision=0,pending=null,writing=false,timer=null,refreshing=null,pulling=null,queuedPull=false,events=null,stopped=false,activeKey=null,bootstrapSupported=true;
 let connectionEpoch=0,connecting=null;
 const listeners=new Map(),history=new Map(),messageVersions=new Map();let messageVersion=0;
 const metrics=new Proxy({requests:0,refreshes:0,messagePatches:0,historyLoads:0,connections:0},{set(target,key,value){target[key]=value;const data=document.documentElement?.dataset;if(data)data['api'+key[0].toUpperCase()+key.slice(1)]=String(value);return true;}});
 const B=window.BiscordAPI={session:null,workspace:null,onChange:null,onMessages:null,onStatus:null,metrics,history};
 B.on=(type,fn)=>{if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);return()=>listeners.get(type)?.delete(fn);};
 const emit=(type,value)=>{for(const fn of listeners.get(type)||[])fn(value);};
 function merge(list,items){const ids=new Map(list.map(m=>[m.id,m]));for(const m of items){const next={...ids.get(m.id),...m};if(!m.delivery){delete next.delivery;delete next.error;}if(!m.preview){delete next.preview;delete next.hasImage;}ids.set(m.id,next);}return [...ids.values()].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)||a.id.localeCompare(b.id));}
 B.applyMessage=data=>{
  const key=data.key||(data.peerId?'dm:'+data.peerId:null);if(!key||!B.workspace)return;
  const list=B.workspace.messages[key]||[],old=data.message&&list.find(m=>m.id===data.message.id);
  if(data.action==='delete')B.workspace.messages[key]=list.filter(m=>m.id!==data.id);
  else if(data.message){if(old&&JSON.stringify(old)===JSON.stringify(data.message))return;B.workspace.messages[key]=merge(list,[data.message]);}
  else return;
  messageVersions.set(key+'\n'+(data.id||data.message.id),++messageVersion);
  B.metrics.messagePatches++;B.onMessages?.({key,ids:[data.id||data.message.id],action:data.action||'upsert'});
  const p=B.session?.preferences;
  if(data.message&&!old&&data.message.author!=='self'&&key.startsWith('dm:')&&p?.status!=='dnd'&&!p?.streamerMode){
   if(p.messageSounds)window.BiscordSounds?.play('message');
   if(p.desktopNotifications&&document.hidden&&'Notification' in window&&Notification.permission==='granted')new Notification('vulcord · '+(B.workspace.people.find(p=>p.id===data.peerId)?.name||'Nova mensagem'),{body:p.notificationPreview?data.message.text:'Voce recebeu uma nova mensagem.'});
  }
 };
 B.request=async(path,{method='GET',body,...options}={})=>{
  B.metrics.requests++;const response=await fetch('/api'+path,{signal:AbortSignal.timeout(20000),...options,method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Erro de comunicacao.'),{status:response.status,...data});
  if(method!=='GET'&&(data.message||data.action==='delete')&&(data.key||data.peerId))B.applyMessage(data);
  return data;
 };
 B.refresh=()=>refreshing||= (async()=>{
  B.metrics.refreshes++;let session,workspace;
  if(bootstrapSupported){try{const data=await B.request('/bootstrap');session=data.session;workspace=data.workspace;B.eventCursor??=data.eventCursor||0;}catch(e){if(e.status!==404)throw e;bootstrapSupported=false;}}
  if(!session)[session,workspace]=await Promise.all([B.request('/session'),B.request('/workspace')]);
  const cached=B.workspace?.messages||{};for(const [key,items]of Object.entries(cached)){
   if(key.startsWith('dm:')&&(Object.hasOwn(workspace.data.messages,key)||items.some(m=>m.delivery)&&workspace.data.people.some(p=>p.id===key.slice(3))))workspace.data.messages[key]=merge(workspace.data.messages[key]||[],items);
   else if(key.startsWith('dm:'))history.delete(key);
   else if(workspace.data.servers.some(s=>s.shared&&s.channels?.some(c=>c.type==='text'&&key===s.id+':'+c.id)))workspace.data.messages[key]=merge(items,workspace.data.messages[key]||[]);
   else history.delete(key);
  }
  csrf=session.csrf;B.session=session;revision=workspace.revision;B.workspace=workspace.data;return session;
 })().finally(()=>{refreshing=null;});
 async function pull(){if(writing||pending){queuedPull=true;return;}if(pulling){queuedPull=true;return pulling;}pulling=(async()=>{try{await B.refresh();B.onChange?.(B.session,B.workspace);}catch(e){if(e.status===401){B.dispose();location.replace('/login');}else B.onStatus?.('offline',e.message);}})().finally(()=>{pulling=null;if(queuedPull){queuedPull=false;queueMicrotask(pull);}});return pulling;}
 B.loadHistory=async(key,{older=false,force=false}={})=>{
  if(!key)return;let state=history.get(key);if(!state){state={loaded:false,hasMore:true,before:null,pending:null};history.set(key,state);}
  if(state.pending)return state.pending;if(!force&&!older&&state.loaded)return;if(older&&(!state.loaded||!state.hasMore))return;
  const params=new URLSearchParams({limit:'50'});
  if(key.startsWith('dm:'))params.set('peer',key.slice(3));else{const i=key.lastIndexOf(':');if(i<1)return;const id=key.slice(0,i);if(!B.workspace.servers.some(s=>s.id===id&&s.shared))return;params.set('server',id);params.set('channel',key.slice(i+1));}
  if(older&&state.before)params.set('before',state.before);
  const version=messageVersion;
  state.pending=(async()=>{B.metrics.historyLoads++;const data=await B.request('/history?'+params);const incoming=data.items.filter(m=>(messageVersions.get(key+'\n'+m.id)||0)<=version),current=B.workspace.messages[key]||[],returned=new Set(data.items.map(m=>m.id)),oldest=data.items[0];const kept=force&&!older?current.filter(m=>m.delivery||returned.has(m.id)||(messageVersions.get(key+'\n'+m.id)||0)>version||(data.hasMore&&oldest&&(Date.parse(m.date)<Date.parse(oldest.date)||(m.date===oldest.date&&m.id<oldest.id)))):current;B.workspace.messages[key]=merge(kept,incoming);state.loaded=true;if(older||!state.before){state.hasMore=data.hasMore;state.before=data.before;}B.onMessages?.({key,history:true,prepend:older,ids:data.items.map(m=>m.id)});return data;})().catch(e=>{state.error=e.message;B.onStatus?.('offline',e.message);throw e;}).finally(()=>{state.pending=null;});return state.pending;
 };
 B.setActiveConversation=key=>{if(activeKey===key)return;activeKey=key;B.activeConversation=key;if(key)B.loadHistory(key).catch(()=>{});};
 B.findMessages=async(key,{query,pinned=false,all=false}={})=>{
  const params=new URLSearchParams({limit:pinned?'100':'25'});if(query)params.set('query',query);if(pinned)params.set('pinned','true');
  if(all){params.set('all','true');return (await B.request('/history?'+params)).results;}
  if(key.startsWith('dm:'))params.set('peer',key.slice(3));else{const i=key.lastIndexOf(':');if(i<1||!B.workspace.servers.some(s=>s.shared&&s.id===key.slice(0,i)))return [];params.set('server',key.slice(0,i));params.set('channel',key.slice(i+1));}
  const results=[];let page;do{page=await B.request('/history?'+params);results.push(...page.items.map(m=>({key,m})));if(page.before)params.set('before',page.before);}while(pinned&&page.hasMore);return results;
 };
 async function write(){clearTimeout(timer);if(writing||!pending)return;writing=true;const data=pending;pending=null;B.onStatus?.('saving');try{const result=await B.request('/workspace',{method:'PUT',body:{data,revision}});revision=result.revision;const messages={...data.messages};for(const [key,list]of Object.entries(B.workspace.messages))if(key.startsWith('dm:')||B.workspace.servers.some(s=>s.shared&&key.startsWith(s.id+':')))messages[key]=list;B.workspace={...data,messages};B.onStatus?.('saved');}catch(e){if(e.status===409){pending=null;await B.refresh();B.onChange?.(B.session,B.workspace);B.onStatus?.('conflict',e.message);}else{if(!pending)pending=data;B.onStatus?.('offline',e.message);}}finally{writing=false;if(pending)timer=setTimeout(write,1500);else if(queuedPull){queuedPull=false;pull();}}}
 B.saveWorkspace=data=>{const copy={...data,messages:Object.fromEntries(Object.entries(data.messages).filter(([key])=>!key.startsWith('dm:')&&!data.servers.some(s=>s.shared&&key.startsWith(s.id+':'))))};pending=JSON.parse(JSON.stringify(copy));delete pending.preferences;clearTimeout(timer);timer=setTimeout(write,250);};
 B.flush=async()=>{while(writing)await new Promise(r=>setTimeout(r,30));if(pending)await write();if(pending)throw Error('Nao foi possivel sincronizar. Tente novamente antes de sair.');};
 B.updateProfile=async data=>{await B.flush();const result=await B.request('/profile',{method:'PATCH',body:data});B.session.user=result.user;B.onChange?.(B.session,B.workspace);return result.user;};
 B.updatePreferences=async data=>{await B.flush();const result=await B.request('/preferences',{method:'PATCH',body:data});B.session.preferences=result.preferences;B.onChange?.(B.session,B.workspace);return result.preferences;};
 function handleEvent(type,payload){if(type==='change'){if(payload.type==='message')B.applyMessage(payload);else pull();}else if(type==='revoked'){B.dispose();location.replace('/login');}else emit(type,payload);}
 B.dispose=()=>{stopped=true;connectionEpoch++;events?.close();events=null;B.realtime?.dispose();B.realtime=null;clearTimeout(timer);};
 B.logout=async()=>{await B.flush();await B.request('/logout',{method:'POST',body:{}});B.dispose();sessionStorage.removeItem('biscord-profile');location.href='/login';};
 async function connect(){
  if(stopped||events||B.realtime||connecting===connectionEpoch)return;
  const epoch=connectionEpoch;connecting=epoch;const current=()=>!stopped&&epoch===connectionEpoch;
  try{
   try{const config=await B.request('/realtime');if(!current())return;if(config.enabled){const module=await import('/client/realtime.js');if(!current())return;const transport=await module.connectRealtime(B,config,handleEvent);if(!current()){transport.dispose();return;}B.realtime=transport;B.metrics.connections++;return;}}catch(error){if(!current())return;if(error.status===401){B.dispose();location.replace('/login');return;}if(error.status!==404)B.onStatus?.('offline',error.message);}
   if(!current()||events)return;events=new EventSource('/api/events');B.metrics.connections++;
   for(const type of ['change','rtc','revoked'])events.addEventListener(type,event=>handleEvent(type,JSON.parse(event.data)));
   let opened=false;events.onopen=()=>{if(opened){pull();if(activeKey)B.loadHistory(activeKey,{force:true}).catch(()=>{});}opened=true;};
  }finally{if(connecting===epoch)connecting=null;}
 }
 window.addEventListener('online',()=>{write();B.realtime?.catchUp().catch(()=>{});if(activeKey)B.loadHistory(activeKey,{force:true}).catch(()=>{});});
 window.addEventListener('pagehide',()=>B.dispose());
 window.addEventListener('pageshow',event=>{if(event.persisted){stopped=false;connect();}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){pull();B.realtime?.catchUp().catch(()=>{});if(activeKey)B.loadHistory(activeKey,{force:true}).catch(()=>{});}else B.flush().catch(()=>{});});
 B.ready=B.refresh().then(session=>{connect();return session;}).catch(error=>{if(error.status===401)location.replace('/login');else window.BiscordLoading?.fail('Nao foi possivel conectar ao vulcord. Verifique sua conexao e tente novamente.');return null;});
})();
