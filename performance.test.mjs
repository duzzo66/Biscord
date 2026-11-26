// JavaScript / performance.test.mjs / Node 24 / pagination, retry safety, access control and incremental client regression checks
import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {randomUUID,createHmac} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createBackend} from './backend.mjs';
import {realtimeConfig} from './realtime-auth.mjs';

test('bounded bootstrap, stable history cursors, retries, search, pins and authorization',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'biscord-performance-')),backend=createBackend({dataDir:dir});await backend.ready;
 const server=http.createServer((req,res)=>backend.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let db;t.after(async()=>{await new Promise(r=>server.close(r));db?.close();await backend.close();assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));fs.rmSync(dir,{recursive:true,force:true});});
 async function client(name){let cookie='',csrf='';const call=async(p,method='GET',data)=>{const r=await fetch(base+'/api'+p,{method,headers:{Origin:base,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const body=await r.json();csrf=body.csrf||csrf;return {status:r.status,body,timing:r.headers.get('server-timing')};};const created=await call('/register','POST',{username:name,email:name+'@example.test',password:'Performance-test-123!',acceptTerms:true});assert.equal(created.status,201);return {id:created.body.user.id,call};}
 const a=await client('history_a'),b=await client('history_b'),other=await client('history_other');
 db=new DatabaseSync(path.join(dir,'biscord.sqlite'));const insert=db.prepare('INSERT INTO direct_messages(id,sender,receiver,text,image,created,metadata) VALUES(?,?,?,?,?,?,?)');
 const created=Date.now()-10000;for(let i=0;i<125;i++)insert.run(String(i).padStart(5,'0'),a.id,b.id,'historical '+i,null,created,JSON.stringify({pinned:i===0}));
 for(const id of ['00122','00123','00124'])db.prepare('UPDATE direct_messages SET image=? WHERE id=?').run('data:image/png;base64,'+'a'.repeat(800000),id);
 const initial=await a.call('/bootstrap');assert.equal(initial.status,200);assert.equal(initial.body.workspace.data.messages['dm:'+b.id].length,1);assert.equal(initial.body.workspace.data.messages['dm:'+b.id][0].hasImage,true);assert.equal(initial.body.workspace.data.messages['dm:'+b.id][0].image,null);assert(JSON.stringify(initial.body).length<20000,'bootstrap does not embed attachment bodies');assert.match(initial.timing,/db_queries;desc="\d+"/);
 const ids=[];let before='';do{const page=await a.call('/history?peer='+b.id+'&limit=50'+(before?'&before='+encodeURIComponent(before):''));assert.equal(page.status,200);assert(page.body.items.length<=50);assert(JSON.stringify(page.body).length<2200000);ids.push(...page.body.items.map(m=>m.id));before=page.body.before;}while(before);
 assert.equal(ids.length,125);assert.equal(new Set(ids).size,125);assert.deepEqual([...ids].sort(),Array.from({length:125},(_,i)=>String(i).padStart(5,'0')));
 assert.equal((await other.call('/history?peer='+a.id)).body.items.length,0);
 assert.equal((await a.call('/history?peer='+b.id+'&limit=2.5')).status,400);assert.equal((await a.call('/history?peer='+b.id+'&before=invalid')).status,400);
 assert.equal((await a.call('/history?peer='+b.id+'&query=historical%200')).body.items[0].text,'historical 0');
 assert.equal((await a.call('/history?peer='+b.id+'&pinned=true')).body.items[0].id,'00000');
 assert.equal((await other.call('/history?all=true&query=historical')).body.results.length,0);
 const clientId=randomUUID();const retries=await Promise.all([a.call('/dm/'+b.id,'POST',{text:'exactly once',clientId}),a.call('/dm/'+b.id,'POST',{text:'exactly once',clientId})]);assert.deepEqual(retries.map(r=>r.status).sort(),[200,201]);assert.equal(db.prepare('SELECT count(*) n FROM direct_messages WHERE id=?').get(clientId).n,1);
 assert.equal((await other.call('/dm/'+b.id,'POST',{text:'collision',clientId})).status,409);
 await b.call('/friends/'+a.id,'POST',{action:'block'});assert.equal((await a.call('/history?peer='+b.id)).status,403);assert.equal((await a.call('/history?all=true&query=historical')).body.results.length,0);
 assert.equal((await a.call('/account','DELETE',{password:'Performance-test-123!',confirm:'history_a'})).status,200);
});

test('realtime token contains only a short-lived restricted role and no signing secret',()=>{
 const secret='test-signing-secret',config=realtimeConfig({id:'user'}, {id:'session'}, {SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public-key',SUPABASE_JWT_SECRET:secret});
 const [header,payload,signature]=config.token.split('.'),claims=JSON.parse(Buffer.from(payload,'base64url'));
 assert.equal(claims.role,'biscord_realtime');assert.equal(claims.biscord_user_id,'user');assert.equal(claims.exp-claims.iat,120);assert.equal(signature,createHmac('sha256',secret).update(header+'.'+payload).digest('base64url'));assert(!JSON.stringify(config).includes(secret));assert.deepEqual(realtimeConfig({},{},{}),{enabled:false});
});

test('client patches messages without bootstrap requests and cleans up the shared transport',async()=>{
 let requests=0,connections=0,closed=0,patches=0,fullRenders=0;const handlers={};let resolveHistory;let historyItems=[];
 const workspace={data:{people:[],servers:[],blocked:[],messages:{}},revision:0};
 const context={URLSearchParams,AbortSignal,setTimeout,clearTimeout,queueMicrotask,console,location:{replace(){}},sessionStorage:{removeItem(){}},document:{hidden:false,visibilityState:'visible',addEventListener(){}},EventSource:class{constructor(){connections++;}addEventListener(k,fn){handlers[k]=fn;}close(){closed++;}},fetch:async url=>{requests++;let body;if(url==='/api/bootstrap')body={eventCursor:0,session:{csrf:'csrf',preferences:{}},workspace:structuredClone(workspace)};else if(url==='/api/realtime')body={enabled:false};else if(url.startsWith('/api/history'))body=await new Promise(r=>{resolveHistory=()=>r({items:historyItems,hasMore:false,before:null});});else throw Error(url);return {ok:true,json:async()=>body};}};
 context.window={addEventListener(){}};vm.runInNewContext(fs.readFileSync(new URL('./client/api.js',import.meta.url),'utf8'),context);const api=context.window.BiscordAPI;await api.ready;await new Promise(setImmediate);assert.equal(connections,1);api.onMessages=()=>patches++;api.onChange=()=>fullRenders++;
 const count=requests,m={id:'one',author:'someone',text:'hello',date:new Date().toISOString()};handlers.change({data:JSON.stringify({type:'message',peerId:'peer',message:m})});handlers.change({data:JSON.stringify({type:'message',peerId:'peer',message:m})});assert.equal(requests,count);assert.equal(patches,1);assert.equal(fullRenders,0);assert.equal(api.workspace.messages['dm:peer'].length,1);
 const loading=api.loadHistory('dm:peer');historyItems=[m];api.applyMessage({peerId:'peer',action:'delete',id:'one'});resolveHistory();await loading;assert.equal(api.workspace.messages['dm:peer'].length,0,'a late history response must not resurrect a deleted message');
 api.workspace.messages['dm:peer'].push({...m,delivery:'pending'});api.applyMessage({peerId:'peer',message:m});assert.equal(api.workspace.messages['dm:peer'][0].delivery,undefined,'a server acknowledgement clears optimistic delivery state');
 api.applyMessage({peerId:'peer',message:m});const refresh=api.loadHistory('dm:peer',{force:true});historyItems=[];resolveHistory();await refresh;assert.equal(api.workspace.messages['dm:peer'].length,0,'reconnect removes messages deleted while offline');
 workspace.data.people=[{id:'peer'}];api.workspace.messages['dm:peer']=[{...m,id:'pending',delivery:'failed'}];await api.refresh();assert.equal(api.workspace.messages['dm:peer'][0].delivery,'failed','metadata refresh preserves an unsent first message');
 api.workspace.messages['room:text']=[m];api.history.set('room:text',{loaded:true});await api.refresh();assert(!api.history.has('room:text'),'leaving a server invalidates its cached pagination before rejoining');api.dispose();assert.equal(closed,1);
});

test('a delayed connection from before pagehide cannot survive a back-forward restore',async()=>{
 const events={},configs=[];let connections=0,closed=0;
 const context={URLSearchParams,AbortSignal,setTimeout,clearTimeout,queueMicrotask,console,location:{replace(){}},sessionStorage:{removeItem(){}},document:{addEventListener(){}},EventSource:class{constructor(){connections++;}addEventListener(){}close(){closed++;}},fetch:async url=>{const body=url==='/api/bootstrap'?{eventCursor:0,session:{csrf:'csrf',preferences:{}},workspace:{revision:0,data:{people:[],servers:[],blocked:[],messages:{}}}}:await new Promise(resolve=>configs.push(resolve));return {ok:true,json:async()=>body};}};
 context.window={addEventListener:(type,fn)=>events[type]=fn};vm.runInNewContext(fs.readFileSync(new URL('./client/api.js',import.meta.url),'utf8'),context);const api=context.window.BiscordAPI;await api.ready;await new Promise(setImmediate);assert.equal(configs.length,1);
 events.pagehide();events.pageshow({persisted:true});await new Promise(setImmediate);assert.equal(configs.length,2);configs[0]({enabled:false});await new Promise(setImmediate);assert.equal(connections,0);configs[1]({enabled:false});await new Promise(setImmediate);assert.equal(connections,1);api.dispose();assert.equal(closed,1);
});
