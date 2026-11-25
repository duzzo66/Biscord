// JavaScript / local-internet.test.mjs / Node 24 / local API lifecycle and proxy-compatible sessions
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
test('local internet mode uses persistent SQLite, protects sessions and delivers messages through SSE',async t=>{
 const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'biscord-local-internet-'));
 const processEnv={...process.env,PORT:String(port),BISCORD_DATA_DIR:dir,PUBLIC_ORIGIN:'https://frontend.example.test',DATABASE_URL:'postgres://invalid.invalid/no',BISCORD_CLOUD:'true',BISCORD_ENCRYPTION_KEY:'',LOCAL_ORIGIN:''};
 const child=spawn(process.execPath,['local-internet.mjs'],{env:processEnv,stdio:['ignore','pipe','pipe'],windowsHide:true});
 let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 t.after(async()=>{if(child.exitCode===null){const exit=once(child,'exit');child.kill();await exit;}});
 const base='http://127.0.0.1:'+port;
 let ready=false;
 for(let i=0;i<100;i++){try{const r=await fetch(base+'/healthz');if(r.ok){assert.equal((await r.json()).storage,'sqlite');ready=true;break;}}catch{}if(child.exitCode!==null)throw Error(output);await new Promise(r=>setTimeout(r,50));}
 assert(ready,output);
 assert.equal((await fetch(base+'/')).status,404);
 function account(){return {cookie:'',csrf:'',async call(route,data){const r=await fetch(base+'/api'+route,{method:'POST',headers:{Origin:processEnv.PUBLIC_ORIGIN,'Content-Type':'application/json',Cookie:this.cookie,'X-CSRF-Token':this.csrf},body:JSON.stringify(data)});const cookie=r.headers.get('set-cookie');if(cookie){assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.match(cookie,/Secure/);assert.doesNotMatch(cookie,/Domain=/);this.cookie=cookie.split(';')[0];}const value=await r.json();this.csrf=value.csrf||this.csrf;return {status:r.status,...value};}};}
 const a=account(),b=account();
 const signup=name=>({username:name,email:name+'@example.test',password:'Long-local-password-2026',acceptTerms:true});
 const alice=await a.call('/register',signup('localalice')),bob=await b.call('/register',signup('localbob'));
 assert.equal(alice.status,201);assert.equal(bob.status,201);
 assert.equal((await a.call('/friends/request',{username:'localbob'})).status,201);
 assert.equal((await b.call('/friends/'+alice.user.id,{action:'accept'})).status,200);
 const controller=new AbortController();t.after(()=>controller.abort());
 const response=await fetch(base+'/api/events',{headers:{Cookie:b.cookie},signal:controller.signal});
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/event-stream/);
 const reader=response.body.getReader();await reader.read();
 assert.equal((await a.call('/dm/'+bob.user.id,{text:'Mensagem via backend local'})).status,201);
 const event=await Promise.race([reader.read(),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('SSE timeout')),5000);timer.unref();})]);
 assert.match(new TextDecoder().decode(event.value),/Mensagem via backend local/);
 controller.abort();
 const denied=await fetch(base+'/api/login',{method:'POST',headers:{Origin:'https://other.example.test','Content-Type':'application/json'},body:JSON.stringify({})});assert.equal(denied.status,403);
 assert(fs.existsSync(path.join(dir,'biscord.sqlite')));assert(fs.existsSync(path.join(dir,'encryption.key')));
});
