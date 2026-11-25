// JavaScript / supabase-social-check.mjs / Node.js 24 / disposable remote social integration
import http from 'node:http';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createBackend} from './backend.mjs';
import {openDatabase} from './database.mjs';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL não configurada.');
const options={dataDir:'data/supabase-runtime',databaseUrl:process.env.DATABASE_URL,projectRef:process.env.SUPABASE_PROJECT_REF,sslRootCert:process.env.PGSSLROOTCERT};
const backend=createBackend(options);await backend.ready;
const server=http.createServer(async(req,res)=>{if(!await backend.handle(req,res))res.writeHead(404).end();});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port,run=randomBytes(5).toString('hex'),password=randomBytes(24).toString('base64url'),created=[];
function client(){return {cookie:'',csrf:'',async call(route,method='GET',body){const response=await fetch(base+'/api'+route,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:this.cookie,'X-CSRF-Token':this.csrf},...(body===undefined?{}:{body:JSON.stringify(body)})});const setCookie=response.headers.get('set-cookie');if(setCookie)this.cookie=setCookie.split(';')[0];const data=await response.json();if(data.csrf)this.csrf=data.csrf;return {status:response.status,data};}};}
const a=client(),b=client(),controller=new AbortController();let reader;
try{
 for(const [i,c] of [a,b].entries()){const username=`qa_${run}_${i}`,result=await c.call('/register','POST',{username,displayName:'Teste temporário '+i,email:username+'@example.test',password,acceptTerms:true});assert.equal(result.status,201);created.push(result.data.user.id);c.username=username;}
 const stream=await fetch(base+'/api/events',{headers:{Cookie:b.cookie},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])});assert.equal(stream.status,200);reader=stream.body.getReader();await reader.read();
 assert.equal((await a.call('/friends/request','POST',{username:b.username})).status,201);
 assert.match(new TextDecoder().decode((await reader.read()).value),/"type":"social"/);
 let aw=(await a.call('/workspace')).data.data,bw=(await b.call('/workspace')).data.data;
 assert.equal(aw.pending[0].direction,'outgoing');assert.equal(bw.pending[0].direction,'incoming');
 assert.equal((await a.call('/friends/request','POST',{username:b.username})).status,409);
 assert.equal((await b.call('/friends/'+created[0],'POST',{action:'accept'})).status,200);
 aw=(await a.call('/workspace')).data.data;bw=(await b.call('/workspace')).data.data;
 assert.ok(aw.people.some(x=>x.id===created[1]));assert.ok(bw.people.some(x=>x.id===created[0]));assert.equal(aw.pending.length,0);assert.equal(bw.pending.length,0);
 assert.equal((await a.call('/dm/'+created[1],'POST',{text:'Teste temporário de amizade e mensagem.'})).status,201);
 bw=(await b.call('/workspace')).data.data;assert.equal(bw.messages['dm:'+created[0]][0].text,'Teste temporário de amizade e mensagem.');
 assert.equal((await b.call('/friends/'+created[0],'POST',{action:'block'})).status,200);
 assert.equal((await a.call('/dm/'+created[1],'POST',{text:'Não deve ser enviada.'})).status,403);
 console.log('PASS: envio, recebimento, SSE, duplicação, aceitação, mensagem e bloqueio no Supabase.');
}finally{
 controller.abort();try{await reader?.cancel();}catch{}
 // Only generated account IDs are removed; no existing account is touched.
 const cleanup=openDatabase(options);try{for(const id of created)await cleanup.prepare('DELETE FROM users WHERE id=?').run(id);const remaining=await cleanup.prepare('SELECT COUNT(*) AS count FROM users').get();console.log('Contas de teste removidas; contas restantes no schema:',remaining.count);}finally{await cleanup.close();}
 await backend.close();await new Promise(resolve=>server.close(resolve));
}
