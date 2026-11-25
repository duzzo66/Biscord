// JavaScript / boosts.test.mjs / Node.js 24 / boost allocation and backend persistence
import {test} from 'node:test';import assert from 'node:assert/strict';import {boostState,changeBoost} from './boost-policy.mjs';
import {createBackend} from './backend.mjs';import http from 'node:http';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
test('levels, dedicated perk allocations and revocation do not double count boosts',()=>{
 let server={id:'s'};for(let i=0;i<14;i++)server=changeBoost(server,{action:'add'},'u');assert.equal(boostState(server).level,3);
 server=changeBoost(server,{action:'allocate',perk:'tag',enabled:true},'u');assert.equal(boostState(server).level,2);assert.equal(boostState(server).allocated.tag,true);
 for(let i=0;i<12;i++)server=changeBoost(server,{action:'remove'},'u');assert.equal(boostState(server).allocated.tag,false);assert.equal(boostState(server).level,1);
 assert.throws(()=>changeBoost(server,{action:'allocate',perk:'styles',enabled:true},'u'));assert.throws(()=>changeBoost(server,{action:'remove'},'other'));
});
test('boost API persists levels, isolates accounts and rejects forged workspace benefits',async t=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'biscord-boosts-')),backend=createBackend({dataDir}),server=http.createServer((req,res)=>backend.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{backend.close();await new Promise(r=>server.close(r));});const base='http://127.0.0.1:'+server.address().port;let cookie='',csrf='';
 async function call(route,method='GET',body){const r=await fetch(base+'/api'+route,{method,headers:{Origin:base,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const data=await r.json();if(data.csrf)csrf=data.csrf;return {status:r.status,data};}
 await call('/register','POST',{username:'boost_test',displayName:'Booster',email:'boost@example.test',password:'Long-Test-Password-123!',acceptTerms:true});
 let workspace=(await call('/workspace')).data;workspace.data.servers=[{id:'server-test',name:'Teste',channels:[{id:'general',name:'geral',type:'text'}],boosts:Array(14).fill({userId:'fake'}),boostBenefits:{level:3}}];assert.equal((await call('/workspace','PUT',workspace)).status,200);
 let stored=(await call('/workspace')).data.data.servers[0];assert.equal(stored.boosts.length,0);assert.equal(stored.boostBenefits.level,0);
 assert.equal((await call('/servers/unknown/boosts','POST',{action:'add'})).status,404);
 for(let i=0;i<7;i++)assert.equal((await call('/servers/server-test/boosts','POST',{action:'add'})).status,200);
 stored=(await call('/workspace')).data.data.servers[0];assert.equal(stored.boostBenefits.level,2);assert.equal(stored.boostBenefits.staticBanner,true);
 const allocated=await call('/servers/server-test/boosts','POST',{action:'allocate',perk:'tag',enabled:true});assert.equal(allocated.data.benefits.level,1);assert.equal(allocated.data.benefits.allocated.tag,true);
 assert.equal((await call('/servers/server-test/boosts','POST',{action:'unknown'})).status,400);
});
