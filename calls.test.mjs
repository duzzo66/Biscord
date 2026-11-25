// JavaScript / calls.test.mjs / Node 24 / isolated call signaling authorization
import {test} from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createBackend} from './backend.mjs';
test('call invitations, acceptance, signal delivery and participant authorization',async t=>{
 const backend=createBackend({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'biscord-calls-'))});await backend.ready;const server=http.createServer((q,s)=>backend.handle(q,s));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,controllers=[];
 t.after(async()=>{controllers.forEach(c=>c.abort());await backend.close();server.closeAllConnections();await new Promise(r=>server.close(r));});
 async function account(name){const c={cookie:'',csrf:''};c.request=async(p,data)=>{const r=await fetch(base+'/api'+p,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:c.cookie,'X-CSRF-Token':c.csrf},body:JSON.stringify(data)});if(r.headers.get('set-cookie'))c.cookie=r.headers.get('set-cookie').split(';')[0];const body=await r.json();if(body.csrf)c.csrf=body.csrf;return {status:r.status,...body};};const result=await c.request('/register',{username:name,email:name+'@example.test',password:'Long-password-1234',acceptTerms:true});c.id=result.user.id;return c;}
 const a=await account('caller'),b=await account('callee'),outsider=await account('outsider');assert.equal((await a.request('/calls',{type:'invite',target:b.id})).status,403);
 await a.request('/friends/request',{username:'callee'});await b.request('/friends/'+a.id,{action:'accept'});
 const abort=new AbortController();controllers.push(abort);const events=await fetch(base+'/api/events',{headers:{Cookie:b.cookie},signal:abort.signal});const reader=events.body.getReader();await reader.read();
 const invitation=await a.request('/calls',{type:'invite',target:b.id});assert.equal(invitation.status,201);assert.match(new TextDecoder().decode((await reader.read()).value),/"type":"invite"/);
 assert.equal((await outsider.request('/calls',{type:'signal',id:invitation.id,signal:{type:'offer',sdp:'test'}})).status,404);
 assert.equal((await a.request('/calls',{type:'signal',id:invitation.id,signal:{type:'offer',sdp:'test'}})).status,409);
 assert.equal((await b.request('/calls',{type:'accept',id:invitation.id})).status,200);
 assert.equal((await a.request('/calls',{type:'signal',id:invitation.id,signal:{type:'offer',sdp:'test'}})).status,200);assert.match(new TextDecoder().decode((await reader.read()).value),/"type":"signal"/);
 assert.equal((await b.request('/calls',{type:'end',id:invitation.id})).status,200);assert.equal((await a.request('/calls',{type:'heartbeat',id:invitation.id})).status,404);
});
