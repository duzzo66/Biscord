// JavaScript / database.test.mjs / Node.js 24 / asynchronous storage and proxy behavior
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {openDatabase,postgresQuery,schemaQuery} from './database.mjs';
import {createBackend} from './backend.mjs';
test('SQL placeholders preserve quoted question marks and SQLite conflicts translate to PostgreSQL',()=>{
 assert.equal(postgresQuery("SELECT '?' AS value, \"?\" FROM users WHERE id=? AND name='it''s ?'"),"SELECT '?' AS value, \"?\" FROM users WHERE id=$1 AND name='it''s ?'");
 assert.equal(postgresQuery('INSERT OR IGNORE INTO blocks VALUES(?,?)'),'INSERT INTO blocks VALUES($1,$2) ON CONFLICT DO NOTHING');
 assert.match(postgresQuery('INSERT OR REPLACE INTO mfa_pending VALUES(?,?,?)'),/ON CONFLICT \(session_id\) DO UPDATE SET secret=EXCLUDED.secret,expires=EXCLUDED.expires$/);
});
test('an asynchronous SQLite transaction rolls back without absorbing another request',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'biscord-storage-')),db=openDatabase({dataDir:dir});t.after(()=>db.close());
 await db.exec('CREATE TABLE records(value TEXT)');let release,entered;const started=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
 const transaction=db.transaction(async()=>{await db.prepare('INSERT INTO records VALUES(?)').run('inside');entered();await gate;throw Error('rollback');});
 const rejected=assert.rejects(transaction,/rollback/);await started;const outside=db.prepare('INSERT INTO records VALUES(?)').run('outside');release();await rejected;await outside;
 assert.deepEqual((await db.prepare('SELECT value FROM records').all()).map(r=>r.value),['outside']);
});
test('ngrok public origin enables secure cookies and rejects foreign origins without trusting forwarded headers',async t=>{
 const backend=createBackend({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'biscord-proxy-')),publicOrigin:'https://biscord.example.ngrok.app'});await backend.ready;
 const server=http.createServer((req,res)=>backend.handle(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await backend.close();await new Promise(resolve=>server.close(resolve));});
 const url='http://127.0.0.1:'+server.address().port+'/api/register',payload={username:'proxy_test',displayName:'Proxy',email:'proxy@example.test',password:'Proxy-Test-Password-123!',acceptTerms:true};
 const denied=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://foreign.invalid','X-Forwarded-Host':'biscord.example.ngrok.app','X-Forwarded-Proto':'https'},body:JSON.stringify(payload)});assert.equal(denied.status,403);
 const result=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://biscord.example.ngrok.app'},body:JSON.stringify(payload)});assert.equal(result.status,201);assert.match(result.headers.get('set-cookie'),/; Secure/);
});

test('transaction-pool queries qualify application tables without rewriting literals or existing schemas',()=>{assert.equal(schemaQuery("SELECT u.id FROM users u JOIN sessions s ON s.user_id=u.id WHERE u.username='users'"),"SELECT u.id FROM biscord.users u JOIN biscord.sessions s ON s.user_id=u.id WHERE u.username='users'");assert.equal(schemaQuery('SELECT * FROM biscord.users'),'SELECT * FROM biscord.users');assert.equal(schemaQuery('SELECT table_name FROM information_schema.columns'), 'SELECT table_name FROM information_schema.columns');});
